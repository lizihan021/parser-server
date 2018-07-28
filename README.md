Berkeley Parser Analyser Server
===

This website is an online demo of the <a href="https://github.com/jkkummerfeld/berkeley-parser-analyser">Berkeley Parser Analyser </a>. The server is based on `Express.js`.

Install
---

Make sure  <a href="https://github.com/jkkummerfeld/berkeley-parser-analyser">Berkeley Parser Analyser </a> is in the same folder with this project. And make sure   <a href="https://github.com/jkkummerfeld/berkeley-parser-analyser">Berkeley Parser Analyser </a> is working properly with its sample commands.

Example:

```
some_folder
├── berkeley-parser-analyser
├── parser-server
```

Then under `parser-server` folder, run: `npm install`.

Run
---

If you have gulp installed, run: `gulp`.

Otherwise use: `npm start`.

Parameters
---

The server keeps result files for `30 min`, and will stop working if size of `private` folder is over `500 MB`. You can adjust those parameters in `server/index.js`. 

Server Structure
---

```
parser-server
├── Gulpfile.js				// gulp file
├── README.md
├── app.js					// server wapper
├── bin
│   └── www					// server executable
├── package-lock.json
├── package.json
├── public
│   ├── gold				// gold files that can be selected
│   │   ├── berkeley.mrg
│   │   └── wsj01.mrg
│   ├── results				// result files will be stored here
│   │   └── placeholder
│   ├── stylesheets			// stylesheets
│   │   └── style.css
│   └── upload				// uploaded files will be strored here
│       └── placeholder
├── server
│   ├── index.js			// main file
│   └── uploadUtil.js		// handles file uploading
└── views					// frontend template folder
    ├── download.jade
    ├── error.jade
    ├── index.jade
    ├── layout.jade
    └── message.jade
```

```
parser-server
├── server
│   ├── index.js
is the main file of the server that handles:

'/' , '/upload' , '/download'

'/' root is a form that will submit:
    'test_file'     upload a test file     required 
    'gold_file'     upload a gold file     optional
    'gold_select'   or select a golf file  optional
    'script_select' choose a script        required

'/upload' handles post request of the form. It will run 
          the selected script with test and gold files as inputs.
          Gold file can be either uploaded or choosed from public/gold/
          Result files will be stored at public/results.

'/download' will download files in public/results folder.
```



