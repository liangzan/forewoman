# Forewoman

Forewoman is a Node.js port of [foreman](https://github.com/ddollar/foreman), with the added feature of hot code reloading. Credits to [node-supervisor](https://github.com/isaacs/node-supervisor) for inspiring the hot code reloading implementation.

Export is not completed yet. It will be available from 0.2.x

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

## Usage

### SYNOPSIS

    forewoman start [OPTION]

forewoman start is used to run your application directly from the command line.

If no additional parameters are passed, forewoman will run one instance of each type of process defined in your Procfile.

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

## License

Copyright (c) 2012 Wong Liang Zan. MIT License



