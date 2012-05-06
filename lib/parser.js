var fs = require('fs')
  , path = require('path');

/*
 * parser
 *
 * parses the command line options
 *
 */
var parser = exports;

/*
 * public functions
 */

/*
 * parses the Procfile
 *
 * @param {string} Procfile contents
 * @callback {obj} object with key:val as procName:cmd
 */
parser.parseProcfile = function(fileContents, callback) {
  var procLines = fileContents.split(/[\n\r\u2028\u2029]/);
  var procRegex = /([\w_\d]+)\:\s?([^\n\r\u2028\u2029]+)/;
  var procs = {};
  var match;
  for (var i = 0; i < procLines.length; i++) {
    match = procRegex.exec(procLines[i]);
    if (match) {
      procs[match[1]] = match[2];
    }
  }
  return callback(procs);
};

/*
 * parses the concurrency options
 *
 * @param {obj} command line options
 * @return {obj} object with key:val as procName:cmd
 */
parser.parseConcurrencyOpts = function(cmdOptions) {
  var splittedOpts = (cmdOptions.concurrency || '').split(',');
  var csvOpts = {};
  var opts;
  for (var i = 0; i < splittedOpts.length; i++) {
    opts = splittedOpts[i].split('=');
    if (opts.length === 2) {
      csvOpts[opts[0]] = parseInt(opts[1]);
    }
  }
  return csvOpts;
};

/*
 * parses the concurrency options
 *
 * @param {obj} command line options
 * @return {obj} object with key:val as procName:cmd
 */
parser.parseEnvOpts = function(cmdOptions) {
  var splittedOpts = (envFileContent(cmdOptions) || '').split(/[\n\r\u2028\u2029]/);
  var envOpts = {};
  var opts;
  for (var i = 0; i < splittedOpts.length; i++) {
    opts = splittedOpts[i].split('=');
    if (opts.length === 2) {
      envOpts[opts[0]] = opts[1];
    }
  }
  return envOpts;
};

/*
 * returns the working directory where forewoman should run the commands
 *
 * @param {obj} command line options
 * @return {string} working dir path
 */
parser.cmdWorkingDir = function(cmdOptions) {
  if (cmdOptions.directory) {
    return path.normalize(cmdOptions.directory);
  } else if (cmdOptions.procfile) {
    return path.dirname(cmdOptions.procfile);
  } else {
    return process.cwd();
  }
};

/*
 * parses the watch file options into an object
 *
 * @param {obj} command line options
 * @return {obj} watch file options
 */
parser.parseWatchFileOpts = function(cmdOptions) {
  var watchFilesOpts = {};
  var opts, processOpts, watchItem;
  if (cmdOptions.watch) {
    processOpts = cmdOptions.watch.split(',');
    for (var i = 0; i < processOpts.length; i++ ) {
      opts = processOpts[i].split('=');
      if (opts.length === 2) {
	watchItem = opts[1];
	// if watch is not an absolute path
	if (!watchItem.match(/^\/.*/)) {
	  watchItem = process.cwd() + '/' + watchItem;
	}

	watchFilesOpts[opts[0]] = watchItem;
      }
    }
  }
  return watchFilesOpts;
};


/*
 * returns the env file content
 *
 * @param {obj} command line options
 * @return {string} file content
 */
function envFileContent(cmdOptions) {
  var filePath, envFiles;
  var fileContent = '';
  if (cmdOptions.env) {
    envFiles = cmdOptions.env.split(',');
    for (var i = 0; i < envFiles.length; i++ ) {
      filePath = path.normalize(envFiles[i]);
      if (path.existsSync(filePath)) {
	fileContent += fs.readFileSync(filePath, 'utf8');
	fileContent += "\n";
      }
    }
  } else if (path.existsSync(parser.cmdWorkingDir(cmdOptions) + '/.env')) {
    filePath = parser.cmdWorkingDir(cmdOptions) + '/.env';
    fileContent = fs.readFileSync(filePath, 'utf8');
  }

  return fileContent;
}



