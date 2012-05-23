var fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec
  , _ = require('underscore')
  , Mustache = require('mustache')
  , winston = require('winston').cli()
  , async = require('async')
  , parser = require('../parser');

/*
 * upstart
 *
 * exports the procfile into the upstart format
 *
 */
var upstart = exports;

/*
 * public functions
 */

/*
 * converts the procfile into the desired templates
 *
 * @param {obj} object of process name and its command
 * @param {obj} object of command line options
 * @callback {err} err
 */
upstart.writeTemplates = function(processes, cmdOptions, callback) {
  var buildTemplates = function(procKey, buildCallback) {
    var command = processes[procKey];
    var app = cmdOptions.app;
    var templateOpt = cmdOptions.template;
    var concurrentCount = parser.parseConcurrencyOpts(cmdOptions)[procKey] || 1;
    var concurrentCountArray = _.range(concurrentCount);
    var location = path.normalize(cmdOptions.location);

    var buildTemplate = function(index, buildTemplateCallback) {
      buildProcessTemplate({
	app: app,
	processName: procKey,
	directory: parser.cmdWorkingDir(cmdOptions),
	num: index,
	command: command,
	logRoot: cmdOptions.log || ('/var/log/' + cmdOptions.app),
	envVar: envOpts({command: command, cmdOptions: cmdOptions}),
	writePath: location + '/' + cmdOptions.app + '-' + procKey + '-' + index + '.conf',
	templateOpt: templateOpt
      }, buildTemplateCallback);
    };

    buildProcessMasterTemplate({
      app: app,
      writePath: location + '/' + cmdOptions.app + '-' + procKey + '.conf',
      templateOpt: templateOpt
    }, function(err) {
      async.forEach(concurrentCountArray, buildTemplate, buildCallback);
    });
  };

  return async.series([
    function(checkLocationCallback) {
      checkLocation(cmdOptions, checkLocationCallback);
    },
    function(cleanUpCallback) {
      cleanUpPreviousConfig(cmdOptions.location, cmdOptions.app, cleanUpCallback);
    },
    function(mkdirCallback) {
      var location = path.normalize(cmdOptions.location);
      var logRoot = cmdOptions.log || ('/var/log/' + cmdOptions.app);
      makeDirectories([location, logRoot], mkdirCallback);
    },
    function(writeMasterCallback) {
      writeMasterTemplate(cmdOptions, writeMasterCallback);
    }
  ], function(err, results) {
    if (err) {
      return callback(err);
    } else {
      var processKeys = _.keys(processes);
      return async.forEach(processKeys, buildTemplates, callback);
    }
  });
};

/*
 * private functions
 */

/*
 * creates the master template
 *
 * @param {obj} object of command line options
 * @callback {err} err
 */
function writeMasterTemplate(cmdOptions, callback) {
  var location = path.normalize(cmdOptions.location);
  var logRoot = cmdOptions.log || ('/var/log/' + cmdOptions.app);
  buildMasterTemplate({
    user: cmdOptions.user,
    logRoot: logRoot,
    writePath: location + '/master.conf',
    templateOpt: cmdOptions.template
  }, callback);
}

/*
 * checks if the location is entered
 * it is required for upstart
 *
 * @param {obj} obj of command line options
 * @callback {err} err
 */
function checkLocation(cmdOptions, callback) {
  if (typeof cmdOptions.location === 'undefined') {
    return callback(new Error('Upstart requires a location argument'));
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

/*
 * builds the run template
 *
 * @param {obj} object of options
 * @callback {err} err
 */
function buildMasterTemplate(opts, callback) {
  var viewOpt = {
    user: opts.user,
    logRoot: opts.logRoot
  };

  renderTemplate(templateFilePath('master.conf', opts.templateOpt), viewOpt, function(err, renderedOutput) {
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

/*
 * builds the process master template
 *
 * @param {obj} object of options
 * @callback {err} err
 */
function buildProcessMasterTemplate(opts, callback) {
  var viewOpt = {
    app: opts.app
  };

  renderTemplate(templateFilePath('process_master.conf', opts.templateOpt), viewOpt, function(err, renderedOutput) {
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

/*
 * builds the process templates
 *
 * @param {obj} obj of options
 * @callback {err} err
 */
function buildProcessTemplate(opts, callback) {
  var viewOpt = {
    app: opts.app,
    processName: opts.processName,
    directory: opts.directory,
    port: opts.port,
    command: opts.command,
    logRoot: opts.logRoot,
    num: opts.num,
    envVar: opts.envVar
  };

  renderTemplate(templateFilePath('process.conf', opts.templateOpt), viewOpt, function(err, renderedOutput) {
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
  if (tmpPath) {
    if (!tmpPath.match(/^\/.*/)) {
      return path.normalize(process.cwd() + '/' + tmpPath);
    } else {
      return path.normalize(tmpPath);
    }
  } else {
    return path.normalize(__dirname + '/../../templates/upstart/' + templateName
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
 * returns an object of env opts
 *
 * @param {string} command
 * @param {obj} command line options
 * @return {obj} env variables as an obj
 */
function envOpts(opts) {
  var optObj = _.extend({PORT: opts.cmdOptions.port},
			parser.parseEnvOpts(opts.cmdOptions),
			parser.parseInlineVariables(opts.command));
  var optArray = [];
  return _.each(optObj, function(val, key) {
    var upperCaseKey = key.toUpperCase();
    optArray.unshift({upperCaseKey: val});
  });
}
