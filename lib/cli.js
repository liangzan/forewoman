var fs = require('fs')
  , path = require('path')
  , spawn = require('child_process').spawn
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
 * constants
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
 * -p, --port
 * Specify which port to use as the base for this application. Should be a
 *  multiple of 1000.
 *
 * @param {object} options from command line
 */
cli.start = function(argv) {

  // setting the options
  var options = {};
  options.concurrency = argv.c || argv.concurrency || null;
  options.procfile = argv.f || argv.procfile || null;
  options.port = argv.p || argv.port || null;

  // load Procfile
  var procfilePath;
  if (options.procfile) {
    procfilePath = path.normalize(options.procfile);
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


var colorSet = ['yellow', 'cyan', 'magenta', 'green', 'blue'];
var childProcesses = {};
function spawnProcesses(procs) {
  for (var procName in procs) {
    childProcesses[procName] = spawnProcess(procName, procs[procName]);
  }
}

function spawnProcess(procName, cmd) {
  var color = colorSet[Object.keys(childProcesses).length % colorSet.length];
  var cmdTokens = cmd.split(' ');
  var childProcess = spawn(_.head(cmdTokens),
			   _.tail(cmdTokens),
			   {
			     cwd: process.cwd(),
			     env: process.env
			   });

  childProcess.stdout.on('data', function(data) {
    console.log(('[' + procName + '] ' + data)[color]);
  });

  childProcess.stderr.on('data', function(data) {
    console.log(('[' + procName + '] ' + data)[color]);
  });

  childProcess.on('exit', function(code) {
    console.log(('[' + procName + '] exited with code ' + code)[color]);
  });

  return childProcess;
}