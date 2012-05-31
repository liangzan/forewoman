var fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec
  , _ = require('underscore')
  , Mustache = require('mustache')
  , winston = require('winston').cli()
  , async = require('async')
  , parser = require('../parser');

/*
 * supervisord
 *
 * exports the procfile into the supervisord format
 *
 */
var supervisord = exports;

/*
 * public functions
 */
supervisord.writeTemplates = function(processes, cmdOptions, callback) {
  var location = cmdOptions.location;
  var logRoot = cmdOptions.log || ('/var/log/' + cmdOptions.app);

  return async.series([
    function(checkLocationCallback) {
      checkLocation(cmdOptions, checkLocationCallback);
    },
    function(makeDirCallback) {
      makeDirectories([location], makeDirCallback);
    },
    function(cleanUpCallback) {
      cleanUpPreviousConfig(cmdOptions.location, cmdOptions.app, cleanUpCallback);
    }
  ], function(err, results) {
    if (err) {
      return callback(err);
    } else {
      var processOpts = buildProcessOptions(processes, logRoot, cmdOptions);
      return buildAppTemplate({
	app: cmdOptions.app,
	appNames: getAppNames(processOpts),
	processes: processOpts,
	templateOpt: cmdOptions.template,
	writePath: path.normalize(location + '/' + cmdOptions.app + '.conf')
      }, callback);
    }
  });
};

/*
 * builds the process options
 *
 * @param {obj} obj of process key and commands
 * @param {string} log root path
 * @param {obj} obj of command line options
 * @return {array} array of option objects
 */
function buildProcessOptions(processes, logRoot, cmdOptions) {
  return _.flatten(_.map(_.keys(processes), function(procKey) {
    var concurrentCount = parser.parseConcurrencyOpts(cmdOptions)[procKey] || 1;
    var command = processes[procKey];
    return _.map(_.range(concurrentCount), function(index) {
      return {
	port: cmdOptions.port,
	app: cmdOptions.app,
	appName: getProcessName(cmdOptions.app, procKey, index),
	environmentVar: getEnvOpts(command, cmdOptions),
	processCommand: command,
	processName: procKey,
	logRoot: logRoot,
	directory: parser.cmdWorkingDir(cmdOptions),
	user: cmdOptions.user,
	num: index
      };
    });
  }));
}

/*
 * formats the app names into csv
 *
 * @param {obj} object of process options
 * @return {string} csv of app names
 */
function getAppNames(processOpts) {
  return _.map(processOpts, function(processOpt) {
    return processOpt.app;
  }).join(',');
}

/*
 * forms the process name
 *
 * @param {string} app
 * @param {string} process name
 * @param {int} index
 * @return {string} process name
 */
function getProcessName(app, processName, index) {
  if (index > 0) {
    return app + '-' + processName + '-' + index;
  } else {
    return app + '-' + processName;
  }
}

function getEnvOpts(command, cmdOptions) {
  var envVars = _.extend({PORT: cmdOptions.port},
			 parser.parseEnvOpts(cmdOptions),
			 parser.parseInlineVariables(command));
  return _.map(envVars, function(val, key) {
    return key.toUpperCase() + '=' + val;
  }).join(',');
}

/*
 * builds the process templates
 *
 * @param {obj} obj of options
 * @callback {err}
 */
function buildAppTemplate(opts, callback) {
  var viewOpt = {
    app: opts.app,
    appNames: opts.appNames,
    processes: opts.processes
  };

  renderTemplate(templateFilePath('app.conf', opts.templateOpt), viewOpt, function(err, renderedOutput) {
    if (err) {
      return callback(err.message);
    } else {
      return fs.writeFile(opts.writePath, renderedOutput, function(err) {
	if (err) {
	  return callback(err.message);
	} else {
	  return callback(null);
	}
      });
    }
  });
}

/* returns the template path given the template name
 * overrides with command line template option if given
 *
 * @param {string} template name. currently only master.conf, process.conf, process_master.conf
 * @param {string} optional template path. overrides the default path
 * @return {string} path to template
 */
function templateFilePath(templateName, templateOpt) {
  var parsedTemplateOpt = parser.parseTemplateOpts(templateOpt);
  var tmpPath = parsedTemplateOpt[templateName];
  console.log(templateOpt);
  if (tmpPath) {
    if (!tmpPath.match(/^\/.*/)) {
      return path.normalize(process.cwd() + '/' + tmpPath);
    } else {
      return path.normalize(tmpPath);
    }
  } else {
    return path.normalize(__dirname + '/../../templates/supervisord/' + templateName
			 + '.mustache');
  }
}

/*
 * renders the template
 *
 * @param {string} path to run template
 * @param {obj} object of options
 * @callback {err} err, {string} rendered template
 */
function renderTemplate(templatePath, viewOpts, callback) {
  templateContent(templatePath, function(err, content) {
    if (err) {
      return callback(err, null);
    } else {
      return callback(null, Mustache.to_html(content, viewOpts));
    }
  });
}

/*
 * reads the mustache template from file
 *
 * @param {string} path to run template
 * @callback {err} err, (string) mustache template
 */
function templateContent(templatePath, callback) {
  fs.readFile(templatePath, 'utf8', callback);
}

/*
 * checks if the location is entered
 * it is required for runit
 *
 * @param {obj} obj of command line options
 * @callback {err} err
 */
function checkLocation(cmdOptions, callback) {
  if (typeof cmdOptions.location === 'undefined') {
    return callback(new Error('Supervisord requires a location argument'));
  } else {
    return callback(null);
  }
}

/*
 * creates the required directories
 *
 * @param {array} array of directories. created in order
 * @callback {err} err
 */
function makeDirectories(dirs, callback) {
  var mkdir = function(dir, mkCallback) {
    exec('mkdir -p ' + dir, function(err, stdout, stderr) {
      return mkCallback(err);
    });
  };

  async.forEach(dirs, mkdir, callback);
}

/*
 * cleans up the previous configuration files
 *
 * @param {string} location
 * @param {string} app name
 * @callback {err} err
 */
function cleanUpPreviousConfig(location, app, callback) {
  var confRegex = new RegExp(app + ".*\\.conf");
  var removeConfig = function(fileName, rmCallback) {
    if (confRegex.test(fileName)) {
      return fs.unlink(location + '/' + fileName, rmCallback);
    } else {
      return rmCallback(null);
    }
  };

  fs.readdir(location, function(err, files) {
    async.forEach(files, removeConfig, callback);
  });
}
