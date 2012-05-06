var fs = require('fs')
  , path = require('path')
  , winston = require('winston').cli()
  , parser = require('./parser')
  , processManager = require('./process_manager');

/*
 * CLI - command line interface
 *
 * commands for using notifymode
 */
var cli = exports;

/*
 * private constants
 */
var cmdOptions;
var childProcs = {};
var watchedFiles = {};

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
    winston.help('');
    winston.help('-w, --watch');
    winston.help('Watches the specified files for changes and restart the process');
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
  cmdOptions.watch = argv.w || argv.watch || null;

  // load Procfile
  var procfilePath;
  if (cmdOptions.procfile) {
    procfilePath = path.normalize(cmdOptions.procfile);
  } else {
    procfilePath = process.cwd() + '/Procfile';
  }

  if (cmdOptions.watch) {
    processManager.watchFiles(cmdOptions, childProcs, watchedFiles);
  }

  fs.readFile(procfilePath, 'utf8', function(err, data) {
    if (err) {
      winston.error('[forewoman] Error opening Procfile');
      winston.error(err.message);
    } else {
      winston.info('[forewoman] Procfile loaded');
      parser.parseProcfile(data, function(procs) {
	processManager.spawnProcesses(cmdOptions, childProcs, watchedFiles, procs);
      });
    }
  });

};

