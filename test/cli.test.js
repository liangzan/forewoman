var cli = require('../lib/cli')
  , fs = require('fs')
  , path = require('path')
  , spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , should = require('should')
  , _ = require('underscore');

/*
 * tests the command line options
 */

var command = process.cwd() + '/bin/forewoman';
var fixturesDir = __dirname + '/fixtures/';
var workingDir = process.cwd();
var pidDir = process.cwd() + '/tmp/pids/';
var alternateRoot = process.cwd() + '/test/alternate_root';

function killRunningProcesses(callback) {
  fs.readdir(pidDir, function(err, files) {
    _.each(files, function(file) {
      fs.readFile(pidDir + file, function(err, pidData) {
	exec('kill ' + pidData, function(err, stdout, stderr) {
	  return callback(err);
	});
      });
    });
  });
};

describe('CLI', function() {

  describe('start', function() {
    describe('with a non-existent Procfile', function() {
      before(function(done) {
	var procfilePath = process.cwd() + '/Procfile';
	path.exists(procfilePath, function(exists) {
	  if (exists) {
	    fs.unlink(procfilePath, function(err) {
	      if (err) { console.log(err); }
	      done();
	    });
	  } else {
	    done();
	  }
	});
      });

      it('should print an error', function(done) {
	var forewoman = spawn(command, ['start']);
	var output = '';
	forewoman.stdout.on('data', function(data) {
	  output += data.toString();
	});

	forewoman.stderr.on('data', function(data) {
	  output += data.toString();
	});

	forewoman.on('exit', function(code) {
	  (/\[forewoman\] Error opening Procfile/.test(output)).should.eql(true);
	  (/ENOENT/.test(output)).should.eql(true);
	  done();
	});
      });
    });

    describe('with a Procfile', function() {
      before(function(done) {
	var cp = spawn('cp', [fixturesDir + 'Procfile', workingDir]);
	cp.on('exit', function(code) {
	  done();
	});
      });

      it('runs successfully', function(done) {
	var forewoman = spawn(command, ['start']);

	var output = '';
	forewoman.stdout.on('data', function(data) {
	  output += data.toString();

	  // manually killing the process
	  if (fs.readdirSync(pidDir).length === 2) {
	    killRunningProcesses(function(err) {
	      if (err) {
		console.log(err);
	      }
	    });
	  }
	});

	forewoman.stderr.on('data', function(data) {
	  output += data.toString();
	});

	forewoman.on('exit', function(code) {
	  (/\[forewoman\] Procfile loaded/.test(output)).should.eql(true);
	  done();
	});
      });
    });

    describe('with an alternate root', function() {

      before(function(done) {
	var cp = spawn('cp', [fixturesDir + 'Procfile', workingDir]);
	cp.on('exit', function(code) {
	  done();
	});
      });

      it('reads the Procfile from that root', function(done) {
	var forewoman = spawn(command, ['start', '-d', alternateRoot]);

	var output = '';
	forewoman.stdout.on('data', function(data) {
	  output += data.toString();

	  // manually killing the process
	  if (fs.readdirSync(pidDir).length === 2) {
	    killRunningProcesses(function(err) {
	      if (err) {
		console.log(err);
	      }
	    });
	  }
	});

	forewoman.stderr.on('data', function(data) {
	  output += data.toString();
	});

	forewoman.on('exit', function(code) {
	  (/\[forewoman\] Procfile loaded/.test(output)).should.eql(true);
	  done();
	});
      });
    });
  });

  describe('run', function() {
    describe('with a valid Procfile', function() {
      describe('and a command', function() {
	it('should load the environment file');
	it('should run the command as a string');
      });

      describe('and a non-existent command', function() {
	it('should print an error');
      });

      describe('and a non-executable command', function() {
	it('should print an error');
      });
    });
  });

  describe('export', function() {
    describe('options', function() {
      it('uses .forewoman');
      it('respects .env');
    });

    describe('with a non-existent Procfile', function() {
      it('prints an error');
    });

    describe('with a Procfile', function() {
      describe('with a formatter with a generic error', function() {
	it('prints an error');
      });

      describe('with a valid config', function() {
	it('runs successfully');
      });
    });
  });

  describe('check', function() {
    describe('with a valid Procfile', function() {
      it('displays the jobs');
    });

    describe('with a blank Procfile', function() {
      it('displays an error');
    });

    describe('without a Procfile', function() {
      it('displays an error');
    });
  });

});