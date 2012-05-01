var fs = require('fs')
  , path = require('path')
  , spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , winston = require('winston').cli()
  , colors = require('colors')
  , _ = require('underscore');

/*
 * CLI - command line interface
 *
 * commands for using notifymode
 */
var cli = exports;

/*
 * private constants
 */

var colorSet = ['yellow', 'cyan', 'magenta', 'green', 'blue'];
var childProcesses = {};
var pidDir = process.cwd() + '/tmp/pids/';
var cmdOptions;

/*
 * private functions
 */

/*
 * parses the Procfile
 *
 * @param {string} Procfile contents
 * @callback {obj} object with key:val as procName:cmd
 */
function parseProcfile(fileContents, callback) {
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
}

/*
 * parses the concurrency options
 *
 * @param {string} Procfile contents
 * @callback {obj} object with key:val as procName:cmd
 */
function parseConcurrencyOpts() {
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
}

/*
 * forms the env variables for the process to run in
 *
 * @param {int} index
 * @return {obj} env vars
 */
function procEnvVar(index) {
  var fileEnvVar = parseEnvOpts();
  var envVar = _.extend(process.env, fileEnvVar);
  envVar.PORT = (cmdOptions.port + index);
  return envVar;
}

/*
 * parses the concurrency options
 *
 * @param {string} Procfile contents
 * @callback {obj} object with key:val as procName:cmd
 */
function parseEnvOpts() {
  var splittedOpts = (envFileContent() || '').split(/[\n\r\u2028\u2029]/);
  var envOpts = {};
  var opts;
  for (var i = 0; i < splittedOpts.length; i++) {
    opts = splittedOpts[i].split('=');
    if (opts.length === 2) {
      envOpts[opts[0]] = opts[1];
    }
  }
  return envOpts;
}

/*
 * returns the env file content
 *
 * @return {string} file content
 */
function envFileContent() {
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
  } else if (path.existsSync(cmdWorkingDir() + '/.env')) {
    filePath = cmdWorkingDir() + '/.env';
    fileContent = fs.readFileSync(filePath, 'utf8');
  }

  return fileContent;
}


/*
 * returns the working directory where forewoman should run the commands
 *
 * @return {string} working dir path
 */
function cmdWorkingDir() {
  if (cmdOptions.directory) {
    return path.normalize(cmdOptions.directory);
  } else if (cmdOptions.procfile) {
    return path.dirname(cmdOptions.procfile);
  } else {
    return process.cwd();
  }
}


/*
 * spawns the processes as written on the Profile
 *
 * @param {obj} object of commands
 */
function spawnProcesses(procs) {
  var concurrentCount, key, processName;
  for (var i = 0, index = 0; i < Object.keys(procs).length; i++) {
    key = Object.keys(procs)[i];
    concurrentCount = parseConcurrencyOpts()[key] || 1;
    for (var j = 0; j < concurrentCount; j++) {
      processName = key + '-' + j;
      childProcesses[processName] = spawnProcess({name: processName,
						  command: procs[key],
						  env: procEnvVar(index)});
      index++;
    }
  }
}

/*
 * spawns the individual processes
 *
 * @param {obj} object of options
 */
function spawnProcess(opts) {
  var color = colorSet[Object.keys(childProcesses).length % colorSet.length];
  var cmdTokens = opts.command.split(' ');
  var childProcess = spawn(_.head(cmdTokens),
			   _.tail(cmdTokens),
			   {
			     cwd: cmdWorkingDir(),
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
  path.exists(pidFilePath, function(exists) {
    if (exists) {
      fs.unlinkSync(pidFilePath);
    }
  });
}

/*
 * public functions
 */

/*
 * starts the program
 */
cli.run = function(argv) {
  var command = argv._;

  if (command.length === 0) {
    cli.help();
  } else if (command[0] === 'help') {
    cli.help(command[1]);
  } else {
    cli[command](argv);
  }
};

/*
 * shows the help info
 *
 * @param {string} command
 * @return {null}
 */
cli.help = function(command) {
  switch(command) {
  case 'start':
    winston.help('forewoman start [process]');
    winston.help('');
    winston.help('forewoman start is used to run your application directly from '
		 + 'the command line.');
    winston.help('If no additional parameters are passed, forewoman will run one '
		 + 'instance of each type of process defined in your Procfile.');
    winston.help('If a parameter is passed, foreman will run one instance of the '
		 + 'specified application type.');
    winston.help('');
    winston.help('-c, --concurrency');
    winston.help('Specify the number of each process type to run. The value passed '
		 + 'in should be in the format process=num,process=num');
    winston.help('');
    winston.help('-f, --procfile');
    winston.help('Specify an alternate Procfile to load, implies -d at the '
		 + 'Procfile root.');
    winston.help('');
    winston.help('-d, --directory');
    winston.help('Specify an alternate application root. This defaults to the '
		 + 'directory containing the Procfile.');
    winston.help('');
    winston.help('-e, --env');
    winston.help('Specify one or more .env files to load');
    winston.help('');
    winston.help('-p, --port');
    winston.help('Specify which port to use as the base for this application. '
		 + 'Should be a multiple of 1000.');
    break;

  case 'export':
    winston.help('forewoman export <format> [location]');
    winston.help('');
    winston.help('forewoman export is used to export your application to another '
		 + 'process management format.');
    winston.help('');
    winston.help('An location to export can be passed as an argument. This argument '
		 + 'may be either required or optional depending on the export'
		 + ' format.');
    winston.help('');
    winston.help('-a, --app');
    winston.help('Use this name rather than the application\'s root directory name'
		 + ' as the name of the application when exporting.');
    winston.help('');
    winston.help('-c, --concurrency');
    winston.help('Specify the number of each process type to run. The value passed '
		 + 'in should be in the format process=num,process=num');
    winston.help('');
    winston.help('-l, --log');
    winston.help('Specify the directory to place process logs in.');
    winston.help('');
    winston.help('-p, --port');
    winston.help('Specify which port to use as the base for this application. Should'
		 + ' be a multiple of 1000.');
    winston.help('');
    winston.help('-u, --user');
    winston.help('Specify the user the application should be run as. Defaults to'
		 + ' the app name');
    break;

  default:
    winston.help('Usage: forewoman <command>');
    winston.help('');
    winston.help('where <command> is one of:');
    winston.help('start, export, help');
    winston.help('');
    winston.help('notifymode help <command>');
    winston.help('shows usage info for the command');
  }
};


/*
 * the start command
 * used for starting processes
 *
 * If no additional parameters are passed, forewoman will run one instance of each
 * type of process defined in your Procfile.
 *
 * If a parameter is passed, foreman will run one instance of the specified
 *  application type.
 *
 * The following options control how the application is run:
 *
 * -c, --concurrency
 * Specify the number of each process type to run. The value passed in should be
 * in the format process=num,process=num
 *
 * -f, --procfile
 * Specify an alternate Procfile to load, implies -d at the Procfile root.
 *
 * -d, --directory
 * Specify an alternate application root. This defaults to the directory
 * containing the Procfile.
 *
 * -e, --env
 * Specify one or more .env files to load
 *
 * -p, --port
 * Specify which port to use as the base for this application. Should be a
 *  multiple of 1000.
 *
 * @param {object} options from command line
 */
cli.start = function(argv) {

  // setting the options
  cmdOptions = {};
  cmdOptions.concurrency = argv.c || argv.concurrency || null;
  cmdOptions.procfile = argv.f || argv.procfile || null;
  cmdOptions.directory = argv.d || argv.directory || null;
  cmdOptions.port = parseInt(argv.p || argv.port || 5000);
  cmdOptions.env = argv.e || argv.env || null;

  // load Procfile
  var procfilePath;
  if (cmdOptions.procfile) {
    procfilePath = path.normalize(cmdOptions.procfile);
  } else {
    procfilePath = process.cwd() + '/Procfile';
  }

  fs.readFile(procfilePath, 'utf8', function(err, data) {
    if (err) {
      winston.error('[forewoman] Error opening Procfile');
      winston.error(err.message);
    } else {
      winston.info('[forewoman] Procfile loaded');
      parseProcfile(data, function(procs) {
	spawnProcesses(procs);
      });
    }
  });

};

