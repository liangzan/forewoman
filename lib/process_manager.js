var fs = require('fs')
  , path = require('path')
  , spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , winston = require('winston').cli()
  , colors = require('colors')
  , _ = require('underscore')
  , parser = require('./parser');

var processManager = exports;


/*
 * private variables
 */
var pidDir = process.cwd() + '/tmp/pids/';
var colorSet = ['yellow', 'cyan', 'magenta', 'green', 'blue'];

/*
 * spawns the processes as written on the Profile
 *
 * @param {obj} command line options
 * @param {obj} obj storing running processes
 * @param {obj} processes to start
 */
processManager.spawnProcesses = function(cmdOptions, childProcs, watchedFiles, procs) {
  var concurrentCount, key, processName, envVars;
  for (var i = 0, index = 0; i < Object.keys(procs).length; i++) {
    key = Object.keys(procs)[i];
    concurrentCount = parser.parseConcurrencyOpts(cmdOptions)[key] || 1;
    for (var j = 0; j < concurrentCount; j++) {
      processName = key + '-' + j;
      childProcs[processName] = spawnProcess({name: processName,
					      command: procs[key],
					      env: procEnvVar(cmdOptions, index)},
					     cmdOptions,
					     childProcs,
					     watchedFiles);
      index++;
    }
  }
};

processManager.restartCallback = function(opt) {
  return function(event, filename) {
    _.each(parser.matchingProcesses(opt.procName, opt.childProcs), function(pName) {
      recordWatchedFiles(pName, opt.filePath, opt.watchedFiles);
      killRunningProcess(pName, function(err) {
	if (err) {
	  winston.error('[forewoman] Error stopping the process');
	  winston.error(err.message);
	} else {
	  var prevChildProcess = opt.childProcs[pName];
	  opt.childProcs[pName] = spawnProcess(prevChildProcess.command,
					   opt.cmdOptions,
					   opt.childProcs,
					   opt.watchedFiles);
	}
      });
    });
  };
};


/*
 * start watching the files
 *
 * @param {obj} command line options
 * @param {obj} child processes
 */
processManager.watchFiles = function(cmdOptions, childProcs, watchedFiles) {
  var watchOpts = parser.parseWatchFileOpts(cmdOptions);
  _.each(_.keys(watchOpts), function(procName) {
    findAllWatchFiles(watchOpts[procName], function(filePath) {
      watchGivenFile(filePath, processManager.restartCallback({
	procName: procName,
	childProcs: childProcs,
	filePath: filePath,
	cmdOptions: cmdOptions,
	watchedFiles: watchedFiles
      }));
    });
  });
};

/*
 * private functions
 */

/*
 * kills the running process
 *
 * @param {string} process name
 * @callback {err}
 */
function killRunningProcess(procName, callback) {
  var pidFilePath = pidDir + procName + '.pid';
  fs.readFile(pidFilePath, function(err, pidData) {
    if (err) {
      return callback(err);
    } else {
      return exec('kill ' + pidData.toString(), function(err, stdout, stderr) {
	return callback(null);
      });
    }
  });
};

/*
 * records the watched file name
 * so that i can unwatch it when the process exits
 *
 * @param {string} process name
 * @param {string} watched file path
 */
function recordWatchedFiles(processName, filePath, watchedFiles) {
  if (typeof watchedFiles[processName] !== 'undefined' &&
      watchedFiles[processName].length > 0) {
    watchedFiles[processName].push(filePath);
  } else {
    watchedFiles[processName] = [filePath];
  }
}

/*
 * watch the file specified by the file path
 *
 * @param {string} file path
 * @callback {string} event, {string} filename
 */
function watchGivenFile(filePath, callback) {
  fs.watchFile(filePath, { persistent: false }, callback);
}

/*
 * finds all the files from the given path
 *
 * @param {string} root file path
 * @callback {string} file paths. could be called multiple times
 */
function findAllWatchFiles(path, callback) {
  fs.stat(path, function(err, stats){
    if (err) {
      winston.error('[forewoman] Error retrieving stats for file: ' + path);
      winston.error(err.message);
    } else {
      if (stats.isDirectory()) {
        fs.readdir(path, function(err, fileNames) {
          if(err) {
            winston.error('[forewoman] Error reading path: ' + path);
	    winston.error(err.message);
          } else {
            fileNames.forEach(function(fileName) {
              findAllWatchFiles(path + '/' + fileName, callback);
            });
          }
        });
      } else {
        callback(path);
      }
    }
  });
}

/*
 * forms the env variables for the process to run in
 *
 * @param {int} index
 * @return {obj} env vars
 */
function procEnvVar(cmdOptions, index) {
  var fileEnvVar = parser.parseEnvOpts(cmdOptions);
  // process.env holds references which can cause unwanted side effects
  // cloning prevents changes to the variable values
  var processEnvVar = _.clone(process.env);
  var envVar = _.extend(processEnvVar, fileEnvVar);
  envVar.PORT = (cmdOptions.port + index);
  return envVar;
}

/*
 * spawns the individual processes
 *
 * @param {obj} object of options
 */
function spawnProcess(opts, cmdOptions, childProcs, watchedFiles) {
  var color = colorSet[Object.keys(childProcs).length % colorSet.length];
  var cmdTokens = opts.command.split(' ');
  var childProcess = spawn(_.head(cmdTokens),
			   _.tail(cmdTokens),
			   {
			     cwd: parser.cmdWorkingDir(cmdOptions),
			     env: opts.env
			   });

  childProcess.stdout.on('data', function(data) {
    console.log(('[' + opts.name + '] ' + data)[color]);
  });

  childProcess.stderr.on('data', function(data) {
    console.log(('[' + opts.name + '] ' + data)[color]);
  });

  childProcess.on('exit', function(code) {
    console.log(('[' + opts.name + '] exited with code ' + code)[color]);
    removePIDFile(opts.name);
  });

  childProcess.command = opts;
  writePIDFile(childProcess.pid, opts.name);

  return childProcess;
}

/*
 * writes the pid file of the child process
 *
 * @param {string} child process name
 */
function writePIDFile(pid, name) {
  var pidFilePath = pidDir + name + '.pid';
  exec('mkdir -p ' + pidDir, function(err, stdout, stderr) {
    if (err) {
      winston.error('[forewoman] Error creating the pids directory');
      winston.error(err.message);
    } else {
      fs.writeFileSync(pidFilePath, pid);
    }
  });
}

/*
 * removes the pid file of the child process
 * this only runs if the process is terminated cleanly
 *
 * @param {string} process name
 */
function removePIDFile(name) {
  var pidFilePath = pidDir + name + '.pid';
  fs.exists(pidFilePath, function(exists) {
    if (exists) {
      fs.unlinkSync(pidFilePath);
    }
  });
}

