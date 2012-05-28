var fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec
  , _ = require('underscore')
  , Mustache = require('mustache')
  , winston = require('winston').cli()
  , async = require('async')
  , parser = require('../parser');

/*
 * inittab
 *
 * exports the procfile into the inittab format
 *
 */
var inittab = exports;

/*
 * public functions
 */
inittab.writeTemplates = function(processes, cmdOptions, callback) {
  var app = cmdOptions.app;
  var user = cmdOptions.user;
  var logRoot = cmdOptions.log || ('/var/log/' + cmdOptions.app);

  return async.series([
    function(checkLocationCallback) {
      checkLocation(cmdOptions, checkLocationCallback);
    },
    function(makeDirCallback) {
      makeDirectories([logRoot], makeDirCallback);
    },
    function(chownCallback) {
      chownDirectory(user, logRoot, chownCallback);
    }], function(err, results) {
      if (err) {
	return callback(err);
      } else {
	return buildMasterTemplate({
	  app: app,
	  processes: buildProcessOptions(processes, logRoot, cmdOptions),
	  writePath: path.normalize(cmdOptions.location),
	  templateOpt: cmdOptions.template
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
    return _.map(_.range(concurrentCount), function(index) {
      return {
	id: getID(procKey, index),
	user: cmdOptions.user,
	port: cmdOptions.port,
	processCommand: processes[procKey],
	logRoot: logRoot,
	processName: procKey,
	num: index
      };
    });
  }));
}

/*
 * builds the process templates
 *
 * @param {obj} obj of options
 * @callback {err}
 */
function buildMasterTemplate(opts, callback) {
  var viewOpt = {
    app: opts.app,
    processes: opts.processes
  };

  renderTemplate(templateFilePath('master', opts.templateOpt), viewOpt, function(err, renderedOutput) {
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
    return path.normalize(__dirname + '/../../templates/inittab/' + templateName
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
 * returns the inittab id
 *
 * @param {string} processName
 * @param {int} index
 * @return {string} inittab id
 */
function getID(processName, index) {
  return processName.toUpperCase() + index;
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
 * command to chown a file
 * need to run it manually as i don't have the uid/gid
 *
 * @param (string) user
 * @param (string} path to chown
 * @callback {err} err
 */
function chownDirectory(user, filePath, callback) {
  var cmd = 'chown ' + user + ' ' + filePath;
  exec(cmd, callback);
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
    return callback(new Error('Inittab requires a location argument'));
  } else {
    return callback(null);
  }
}
