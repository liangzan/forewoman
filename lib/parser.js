var fs = require('fs')
  , path = require('path')
  , _ = require('underscore');

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
  return parseCSVOpts(cmdOptions.concurrency, parseInt);
};

/*
 * parses the template options
 *
 * @param {string} template options
 * @return {obj} object with key:val as templateName:path
 */
parser.parseTemplateOpts = function(templateOpt) {
  return parseCSVOpts(templateOpt);
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
 * finds running processes that belongs to the same
 * entry in Procfile
 *
 * @param {string} process name
 * @param {obj} running child processes
 * @return {array} array of process names
 */
parser.matchingProcesses = function(processName, childProcs) {
  var procNameRegex = new RegExp(processName + '\\-\\d+');
  var matches = [];
  var runningProcessNames = _.keys(childProcs);
  for (var i = 0; i < runningProcessNames.length; i++) {
    if (procNameRegex.test(runningProcessNames[i])) {
      matches.push(runningProcessNames[i]);
    }
  }
  return matches;
};

/*
 * parses the inline variables found in the command
 *
 * @param {string} command
 * @return {obj} object of options
 */
parser.parseInlineVariables = function(command) {
  var match;
  var matches = [];
  var inlineRegex = /[a-zA-Z_]+[a-zA-Z0-9_]*=\S+/g;
  while((match = inlineRegex.exec(command)) !== null) {
    matches.push(match[0]);
  }
  var opts, inlineOpts = {};
  for (var i = 0; i < matches.length; i++) {
    opts = matches[i].split('=');
    if (opts.length === 2) {
      inlineOpts[opts[0]] = opts[1];
    }
  }
  return inlineOpts;
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
      if (fs.existsSync(filePath)) {
	fileContent += fs.readFileSync(filePath, 'utf8');
	fileContent += "\n";
      }
    }
  } else if (fs.existsSync(parser.cmdWorkingDir(cmdOptions) + '/.env')) {
    filePath = parser.cmdWorkingDir(cmdOptions) + '/.env';
    fileContent = fs.readFileSync(filePath, 'utf8');
  }

  return fileContent;
}



/*
 * parses the options where options is a string in the format
 * opt=value,opt=value
 *
 * @param {obj} options
 * @return {obj} eg: {opt1:val1, opt2:val2}
 */
function parseCSVOpts(optString, formatter) {
  var splittedOpts = (optString || '').split(',');
  var csvOpts = {};
  var opts;
  for (var i = 0; i < splittedOpts.length; i++) {
    opts = splittedOpts[i].split('=');
    if (opts.length === 2) {
      if (typeof formatter !== 'undefined') {
	csvOpts[opts[0]] = formatter(opts[1]);
      } else {
	csvOpts[opts[0]] = opts[1];
      }
    }
  }
  return csvOpts;
};
