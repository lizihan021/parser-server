// For Gulp 4.0.0 with node v 9.2.0
const gulp = require('gulp');
const spawn = require('child_process').spawn;
let node;

async function startServer() {
  if (node) node.kill();
  node = await spawn("node", ["./bin/www"], { stdio: "inherit" });

  node.on("close", function (code) {
    if(code === 8) {
      console.log("Error detected, waiting for changes...");
    }
  });
}

gulp.task("default", function () {
  startServer();
  // Start the server, if a change is detected restart it
  gulp.watch(
    ['./app.js', './server/*.js', './views/*.jade'],
    {
      queue: false,
      ignoreInitial: false // Execute task on startup 
    },
    startServer);
});

// clean up if an error goes unhandled.
process.on('exit', function() {
    if (node) node.kill();
});