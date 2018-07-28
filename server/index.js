/* -*- coding: utf-8 -*-
This file is the main file of the server that handles:
'/' , '/upload' , '/download'
'/' root is a form that will submit:
    'test_file'     upload a test file     required 
    'gold_file'     upload a gold file     optional
    'gold_select'   or select a golf file  optional
    'script_select' choose a script        required

'/upload' handles post request of the form. It will run 
          the selected script with test and gold files as inputs.
          Gold file can be either uploaded or choosed from public/gold/
          Result files will be stored at private/results.

'/download' will download files in private/results folder.
*/
var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var PythonShell = require('python-shell');
var multer = require('./uploadUtil');
var getSize = require('get-folder-size');

//////////////////////////////////////
// super parameters and file pathes //
//////////////////////////////////////

// keep result file for result_life_time min
var result_life_time = 30; //(min)
// max disk usage
var max_disk_usage = 500; //(MB)
var disk_full_flag = false;
var folder_to_check = "private";
// track visitors 
var logfile = "logfile.log";
var home_num = 0;
var upload_num = 0;
var download_num = 0;
var cur_date = 0;

// relative path of the python script and result folder
var parser_path = '../../berkeley-parser-analyser/berkeley_parse_analyser/';
var gold_path = "../public/gold/";
var result_path = "private/results/";
// prefix of the result
var prefix = "parser.result.";
// file extension of the output of the scripts
var classify_extension = [".error_counts", ".gold_trees", ".init_errors", 
                          ".log", ".out", ".test_trees"];
var print_extension = [".err", ".out", ".tex"]
var script_extension_map = {"classify_english.py": classify_extension, 
                            "classify_chinese.py": classify_extension, 
                            "print_coloured_errors.py": print_extension};

/* helper functions */
// check whether file exist
function _checkFileExist(file_name) {
  try {
    var stats = fs.statSync(file_name);
    return true;
  }
  catch(err) {
    return false;
  }
}

// check whether json input is valid
function _checkInputFile(file_name, req){
  return file_name in req.files && _checkFileExist(
          path.join(__dirname, "../" + req.files[file_name][0].path));
}

// get all filename in a folder as a list
function _getFilesInFolder(dir) {
    var results = [];
    fs.readdirSync(dir).forEach(function(file) {
        file_dir = dir+'/'+file;
        var stat = fs.statSync(file_dir);
        if (stat && stat.isDirectory()) {
            results = results.concat(_getAllFilesFromFolder(file_dir));
        } else results.push(file);

    });
    return results;
}

// sanitize user input, remove special characters from the input string
function _sanitizeInput(str) {
  return str.replace(/[`~!@#$%^&*()|+=?;:'"<>\{\}\[\]\\\/]/g, '');
}

// get date
function _getDate(){
  var tmp = new Date().toISOString();
  return tmp.split('T')[0];
}

// check whether date has change and update log
function _log(){
  var now_date = _getDate();
  console.log(now_date);
  if (now_date != cur_date) {
    var log_content = '\nDate: ' + cur_date + ' visit number: home: ' + home_num +
                      ', upload: ' + upload_num + ', download: ' + download_num;
    fs.appendFile(logfile, log_content, function (err) {
      if (err) console.log(err);
      console.log('Log Saved!');
    });
    cur_date = now_date;
    home_num = 0;
    upload_num = 0;
    download_num = 0;
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  // for tracking visitors
  _log();
  home_num = home_num + 1;

  var gold_select = _getFilesInFolder(path.join(__dirname, gold_path));
  res.render('index', {title: 'Berkeley Parser Analyser',
                       gold_select: gold_select,
                       script_select: Object.keys(script_extension_map)});
});


/* POST upload page */
router.post('/upload', function(req, res, next) {
  // for tracking visitors
  _log();
  upload_num = upload_num + 1;
  // check disk space
  // used async functions and flags to improve performance
  getSize(folder_to_check, (err, size) => {
    if (err) { 
      return;
    }
    console.log((size / 1024 / 1024).toFixed(2) + ' MB');
    if (size / 1024 / 1024 > max_disk_usage) {
      disk_full_flag = true;
    }
    else {
      disk_full_flag = false;
    }
  });
  if (disk_full_flag){
    res.render('message', {message: "disk is full", title: 'Error'});
    return;
  }

  // handle uploads. sanitize input files are done in uploadUtil.js
  var upload = multer.fields([{name: 'test_file', maxCount: 1}, 
                              {name: 'gold_file', maxCount: 1}]);

  upload(req, res, function (err) {
    try {
      // check parsing is corrent
      if (err) {
        throw('Error: ' + err.code);
      }
      if (!req.body || !req.files) {
        throw('Error: parsing error');
      }
      // check script select is correct
      if (!(req.body.script_select in script_extension_map)) {
        throw('Error: scripts select error');
      }
      // sanitize req.body.gold_select
      req.body.gold_select = _sanitizeInput(req.body.gold_select);

      // check file uploaded 
      if (_checkInputFile("test_file", req)) {
        var arg1 = path.join(__dirname, "../" + req.files.test_file[0].path);
        var arg2 = "";
        var arg3 = result_path + prefix + req.files.test_file[0].filename;
        var selected = false;
        // user uploaded a gold file
        if (_checkInputFile("gold_file", req)) {
          arg2 = path.join(__dirname, "../" + req.files.gold_file[0].path);
        }
        // user choosed a gold file
        else if (req.body.gold_select != "none") {
          selected = true;
          var arg2 = path.join(__dirname, gold_path + req.body.gold_select);
          if (!_checkFileExist(arg2)) {
            throw("Error: invalid post request, wrong gold file " + arg2);
          }
        }
        else {
          throw('Error: invalid post request, no gold file');
        }
        // process the request with python script.
        var options = {
          mode: 'text',
          pythonOptions: ['-u'], // get print results in real-time
          scriptPath: path.join(__dirname, parser_path),
          args: [arg1, arg2, arg3]
        };
        var py_script = req.body.script_select;

        PythonShell.run(py_script, options, function (err, results) {
            if (err) {
              throw('Error: python error ' + err.code);
            }
            console.log('results: %j', results);

            // create download links
            var files = [];
            for (var i = script_extension_map[py_script].length - 1; i >= 0; i--) {
              files.push(prefix + req.files.test_file[0].filename + 
                         script_extension_map[py_script][i]);
            }

            // display output, print '.error_counts' file at web page
            if (py_script != "print_coloured_errors.py"){
              var display_file = path.join(__dirname, "../" + result_path + prefix + 
                                 req.files.test_file[0].filename + ".error_counts");
              fs.readFile(display_file, 'utf8', function (err,data) {
                if (!err) {
                  res.render('download', {files: files, 
                                          out_content: data, 
                                          title: 'Download',
                                          expire_time: result_life_time});
                }
                else {
                  res.render('download', {files: files, title: 'Download', 
                                          expire_time: result_life_time});
                }
              });
            }
            else {
              res.render('download', {files: files, title: 'Download', 
                                      expire_time: result_life_time});
            }

            // delete uploaded file
            fs.unlink(arg1, (err)=>{});
            if (!selected) {
              fs.unlink(arg2, (err)=>{});
            }
            // delete result files after 1 min
            setTimeout(function (){
              files.forEach(function(file_name) {
                var file_delete = path.join(__dirname, "../" + result_path + file_name);
                fs.unlink(file_delete, (err)=>{});
              });
            }, result_life_time * 60 * 1000);
        });
      }
      else {
        throw('Error: invalid post request, no test file');
      }
    }
    catch (err){
      console.log(err);
      // if error delete uploaded files
      if (_checkInputFile("test_file", req)) {
        fs.unlink(path.join(__dirname, "../" + req.files.test_file[0].path), (err)=>{});
      }
      if (_checkInputFile("gold_file", req)) {
        fs.unlink(path.join(__dirname, "../" + req.files.gold_file[0].path), (err)=>{});
      }
      res.render('message', {message: err, title: 'Error'});
    }
    
  });
});


/* Download result file */
router.get('/download/:file', function(req, res){
  // for tracking visitors
  _log();
  download_num = download_num + 1;

  var file = path.join(__dirname, "../" + result_path + 
                       _sanitizeInput(req.params.file));
  if (_checkFileExist(file)){
    res.download(file); 
  }
  else {
    res.render('message', {message: 'No file found', title: 'Error'});
  }
});

module.exports = router;
