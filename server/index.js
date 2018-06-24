var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var PythonShell = require('python-shell');
var multer = require('./uploadUtil');
/* helper functions */

// relative path of the python script and result folder
var parser_path = '../../berkeley-parser-analyser/berkeley_parse_analyser/';
var gold_path = "../public/gold/";
var result_path = "public/results/";
// prefix of the result
var prefix = "parser.result.";
// file extension of the output of the scripts
var classify_extension = [".error_counts", ".gold_trees", ".init_errors", 
                          ".log", ".out", ".test_trees"];
var print_extension = [".err", ".out", ".tex"]
var script_extension_map = {"classify_english.py": classify_extension, 
                            "classify_chinese.py": classify_extension, 
                            "print_coloured_errors.py": print_extension};

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
var _getFilesInFolder = function(dir) {
    var results = [];
    fs.readdirSync(dir).forEach(function(file) {
        file_dir = dir+'/'+file;
        var stat = fs.statSync(file_dir);
        if (stat && stat.isDirectory()) {
            results = results.concat(_getAllFilesFromFolder(file_dir));
        } else results.push(file);

    });
    return results;
};


/* GET home page. */
router.get('/', function(req, res, next) {
  var gold_select = _getFilesInFolder(path.join(__dirname, gold_path));
  res.render('index', {title: 'Home',
                       gold_select: gold_select,
                       script_select: Object.keys(script_extension_map)});
});


/* POST upload page */
router.post('/upload', function(req, res, next) {
  var upload = multer.fields([{name: 'test_file', maxCount: 1}, 
                              {name: 'gold_file', maxCount: 1}]);
  // TODO: need to sanitize input.

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

      // check file uploaded 
      if (_checkInputFile("test_file", req)) {
        var arg1 = path.join(__dirname, "../" + req.files.test_file[0].path);
        var arg2 = "";
        var arg3 = result_path + prefix + req.files.test_file[0].filename;
        // user uploaded a gold file
        if (_checkInputFile("gold_file", req)) {
          arg2 = path.join(__dirname, "../" + req.files.gold_file[0].path);
        }
        // user choosed a gold file
        else if (req.body.gold_select != "none") {
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
        });

        // create download links
        var files = [];
        for (var i = script_extension_map[py_script].length - 1; i >= 0; i--) {
          files.push(prefix + req.files.test_file[0].filename + 
                     script_extension_map[py_script][i]);
        }

        // load result downloading page.
        res.render('download', {files: files, title: 'Download'});
      }
      else {
        throw('Error: invalid post request, no test file');
      }
    }
    catch (err){
      console.log(err);
      res.render('message', {message: err, title: 'Error'});
    }
    
  });
});


// download result file
router.get('/download/:file', function(req, res){
  var file = path.join(__dirname, "../" + result_path + req.params.file);
  res.download(file); 
});

module.exports = router;
