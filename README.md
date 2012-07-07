# Forewoman

Forewoman is a Node.js port of [foreman](https://github.com/ddollar/foreman), with the added feature of hot code reloading. Credits to [node-supervisor](https://github.com/isaacs/node-supervisor) for inspiring the hot code reloading implementation.

Forewoman is extracted from the code base of [Notifymode](http://notifymode.com)

## Caveats

Forewoman should work on Linux, Mac OS and other variants of Unix. Windows is not supported.

## Installation

You can install locally

    npm install forewoman

or globally

    npm install -g forewoman

If you choose to install locally, you have to invoke the full path to the __forewoman__ command.

    ./node_modules/forewoman/bin/forewoman

If it is a global install, __forewoman__ should be available from your PATH.

## Versions compatibility

Use v0.2.x for Node v0.6.x. Use the latest for Node v0.8.x.

## Usage

### SYNOPSIS for start

    forewoman start [OPTION]

forewoman start is used to run your application directly from the command line.

If no additional parameters are passed, forewoman will run one instance of each type of process defined in your __Procfile__. The format of a __Procfile__ is explained [here](http://blog.daviddollar.org/2011/05/06/introducing-foreman.html)

If a parameter is passed, forewoman will run one instance of the specified application type.

The following options control how the application is run:

### Options

#### -c, --concurrency
Specify the number of each process type to run. The value passed in should be in the format process=num,process=num

#### -e, --env
Specify one or more .env files to load

#### -d, --directory
Specify an alternate application root. This defaults to the directory containing the Procfile.

#### -f, --procfile
Specify an alternate Procfile to load, implies -d at the Procfile root.

#### -p, --port
Specify which port to use as the base for this application. Should be a multiple of 1000.

#### -w, --watch
Specify the files to watch. If the files are modified, forewoman will restart the process. The value passed in should be in the format process=/path/to/file,process=/path/to/file

### SYNOPSIS for export

    forewoman export <format> <location> [OPTION]

forewoman export is used to export your application to another process management format

An location to export must be passed as an argument.

### Formats

- runit
- upstart
- inittab
- supervisord
- monit (coming)

### Options

#### -a, --app
Use this name rather than the application\'s root directory name as the name of the application when exporting.

#### -c, --concurrency
Specify the number of each process type to run. The value passed in should be in the format process=num,process=num

#### -l, --log
Specify the directory to place process logs in.

#### -p, --port
Specify which port to use as the base for this application. Should be a multiple of 1000.

#### -u, --user
Specify the user the application should be run as. Defaults to the app name

#### -t, --template
Specify an alternate template to use for creating export files. Read the templates directory for examples. Specify your option by template_name=/path/to/template. Eg. runit's log_run.mustache can be replaced by "log_run=/path/to/alt.mustache" The templates should be a [Mustache](https://github.com/janl/mustache.js/) template

#### -d, --directory
Specify an alternate application root. This defaults to the directory containing the Procfile.

#### -e, --env
Specify an alternate environment file. You can specify more than one file by using: --env file1,file2.

#### -f, --procfile
Specify an alternate location for the application's Procfile. This file's containing directory will be assumed to be the root directory of the application.

## License

Copyright (c) 2012 Wong Liang Zan. MIT License
