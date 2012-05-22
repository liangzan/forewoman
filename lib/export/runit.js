var fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec
  , _ = require('underscore')
  , Mustache = require('mustache')
  , winston = require('winston').cli()
  , async = require('async')
  , parser = require('../parser');

/*
 * runit
 *
 * exports the procfile into the runit format
 *
 */
var runit = exports;

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
runit.writeTemplates = function(processes, cmdOptions, callback) {
  var buildTemplates = function(procKey, buildCallback) {
    var command = processes[procKey];
    var procName = procKey;
    var directory = parser.cmdWorkingDir(cmdOptions);
    var location = path.normalize(cmdOptions.location);
    var concurrentCount = parser.parseConcurrencyOpts(cmdOptions)[procName] || 1;
    var concurrentCountArray = _.range(concurrentCount);

    var buildTemplate = function(index, buildTemplateCallback) {
      var processDir, processEnvDir, processLogDir, processRunPath;
      processDir = location + '/' + cmdOptions.app + '-' + procName + '-' + index;
      processRunPath = processDir + '/run';
      processEnvDir = processDir + '/env';
      processLogDir = processDir + '/log';
      makeDirectories([processDir, processEnvDir, processLogDir], function(err) {
	if (err) {
	  return buildTemplateCallback(err.message);
	} else {
	  return async.parallel([
	    function(runTemplateCallback) {
	      buildRunTemplate({
		directory: directory,
		command: command,
		user: cmdOptions.user,
		processEnvDir: processEnvDir,
		processRunPath: processRunPath,
		templateOpt: cmdOptions.template
	      }, runTemplateCallback);
	    },
	    function(envTemplateCallback) {
	      buildEnvTemplates({
		command: command,
		processEnvDir: processEnvDir,
		cmdOptions: cmdOptions
	      }, envTemplateCallback);
	    },
	    function(logRunTemplateCallback) {
	      buildLogRunTemplate({
		cmdOptions: cmdOptions,
		procName: procName,
		index: index,
		processLogRunPath: processLogDir + '/run',
		templateOpt: cmdOptions.template
	      }, logRunTemplateCallback);
	    }
	  ], function(err, results) {
	    return buildTemplateCallback(err);
	  });
	}
      });
    };

    async.forEach(concurrentCountArray, buildTemplate, buildCallback);
  };

  checkLocation(cmdOptions, function(err) {
    if (err) {
      return callback(err);
    } else {
      var processKeys = _.keys(processes);
      return async.forEach(processKeys, buildTemplates, callback);
    }
  });
};

/*
 * private variables
 */

/*
 * private functions
 */


/* returns the template path given the template name
 * overrides with command line template option if given
 *
 * @param {string} template name. currently only run and log_run
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
    return path.normalize(__dirname + '/../../templates/runit/' + templateName
			 + '.mustache');
  }
}


/*
 * build the log run template
 *
 * @param {obj} options for rendering the view
 * @callback {err} err
 */
function buildLogRunTemplate(opts, callback) {
  var viewOpt = {
    logRoot: opts.cmdOptions.log || ('/var/log/' + opts.cmdOptions.app),
    processName: opts.procName,
    num: opts.index,
    user: opts.cmdOptions.user
  };

  renderTemplate(templateFilePath('log_run', opts.templateOpt), viewOpt, function(err, renderedOutput) {
    if (err) {
      return callback(err.message);
    } else {
      return fs.writeFile(opts.processLogRunPath, renderedOutput, function(err) {
	if (err) {
	  return callback(err.message);
	} else {
	  fs.chmodSync(opts.processLogRunPath, 0755);
	  return callback(null);
	}
      });
    }
  });
}

/*
 * build env files
 *
 * @param {obj} object of options
 * @callback {err} err
 */
function buildEnvTemplates(opts, callback) {
  var envOptsObj = envOpts(opts);
  var envOptsKeys = _.keys(envOptsObj);
  var writeEnvFiles = function(envKey, writeCallback) {
    fs.writeFile(opts.processEnvDir + '/' + envKey, envOptsObj[envKey], function(err) {
      if (err) {
	return callback(err.message);
      } else {
	return writeCallback(null);
      }
    });
  };

  async.forEach(envOptsKeys, writeEnvFiles, callback);
}

/*
 * returns an object of env opts
 *
 * @param {string} command
 * @param {obj} command line options
 * @return {obj} env variables as an obj
 */
function envOpts(opts) {
  return _.extend({PORT: opts.cmdOptions.port},
		  parser.parseEnvOpts(opts.cmdOptions),
		  parser.parseInlineVariables(opts.command));
}

/*
 * builds the run template
 *
 * @param {obj} object of options
 * @callback {err} err
 */
function buildRunTemplate(opts, callback) {
  var viewOpt = {
    directory: opts.directory,
    processCommand: opts.command,
    user: opts.user,
    processEnvDir: opts.processEnvDir
  };

  renderTemplate(templateFilePath('run', opts.templateOpt), viewOpt, function(err, renderedOutput) {
    if (err) {
      return callback(err.message);
    } else {
      return fs.writeFile(opts.processRunPath, renderedOutput, function(err) {
	if (err) {
	  return callback(err.message);
	} else {
	  fs.chmodSync(opts.processRunPath, 0755);
	  return callback(null);
	}
      });
    }
  });
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
    return callback(new Error('Runit requires a location argument'));
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
 * renders the template
 *
 * @param {string} path to template
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
