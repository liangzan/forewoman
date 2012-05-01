var cli = require('../lib/cli')
  , fs = require('fs')
  , path = require('path')
  , spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , should = require('should')
  , async = require('async')
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
  var killPID = function(file, pidCallback) {
    fs.readFile(pidDir + file, function(err, pidData) {
      if (err) { console.log(err); }
      else {
	exec('kill ' + pidData.toString(), function(err, stdout, stderr) {
	  return pidCallback();
	});
      }
    });
  };

  fs.readdir(pidDir, function(err, files) {
    async.forEach(files, killPID, callback);
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
	var cmd = 'cp ' + fixturesDir + 'Procfile ' + workingDir;
	var cp = exec(cmd, function(err, stdout, stderr) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      after(function(done) {
	var cmd = 'rm ' + workingDir + '/Procfile';
	var rm = exec(cmd, function(err, stdout, stderr) {
	  if (err) { console.log(err); }
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
	      if (err) { console.log(err); }
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

    describe('with a specified root', function() {
      before(function(done) {
	var cmd = 'cp ' + fixturesDir + 'Procfile ' + workingDir;
	var cp = exec(cmd, function(err, stdout, stderr) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      after(function(done) {
	var cmd = 'rm ' + workingDir + '/Procfile';
	var rm = exec(cmd, function(err, stdout, stderr) {
	  if (err) { console.log(err); }
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
	      if (err) { console.log(err); }
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

    describe('with a specified procfile', function() {
      before(function(done) {
	var cmd = 'cp ' + fixturesDir + 'Procfile.alternate ' + alternateRoot;
	var cp = exec(cmd, function(err, stdout, stderr) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      after(function(done) {
	var cmd = 'rm ' + alternateRoot + '/Procfile.alternate';
	var rm = exec(cmd, function(err, stdout, stderr) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      it('reads the Procfile from that root', function(done) {
	var forewoman = spawn(command, ['start', '-f', alternateRoot + '/Procfile.alternate']);

	var output = '';
	forewoman.stdout.on('data', function(data) {
	  output += data.toString();

	  // manually killing the process
	  if (fs.readdirSync(pidDir).length === 2) {
	    killRunningProcesses(function(err) {
	      if (err) { console.log(err); }
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

    describe('with a specified port', function() {
      before(function(done) {
	var cmd = 'cp ' + fixturesDir + 'Procfile ' + workingDir;
	var cp = exec(cmd, function(err, stdout, stderr) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      after(function(done) {
	var cmd = 'rm ' + workingDir + '/Procfile';
	var rm = exec(cmd, function(err, stdout, stderr) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      it('starts the application from the specified port', function(done) {
	var forewoman = spawn(command, ['start', '-p', 6000]);

	var output = '';
	forewoman.stdout.on('data', function(data) {
	  output += data.toString();

	  // manually killing the process
	  if (/6001/.test(output)) {
	    killRunningProcesses(function(err) {
	      if (err) { console.log(err); }
	    });
	  }
	});

	forewoman.stderr.on('data', function(data) {
	  output += data.toString();
	});

	forewoman.on('exit', function(code) {
	  (/Server running at http\:\/\/127\.0\.0\.1\:6000/.test(output)).should.eql(true);
	  (/Server running at http\:\/\/127\.0\.0\.1\:6001/.test(output)).should.eql(true);
	  done();
	});
      });
    });

    describe('with specified concurrency', function() {
      before(function(done) {
	var cmd = 'cp ' + fixturesDir + 'Procfile ' + workingDir;
	var cp = exec(cmd, function(err, stdout, stderr) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      after(function(done) {
	var cmd = 'rm ' + workingDir + '/Procfile';
	var rm = exec(cmd, function(err, stdout, stderr) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      it('starts the application from the specified port', function(done) {
	var forewoman = spawn(command, ['start', '-c', 'server1=2']);

	var output = '';
	forewoman.stdout.on('data', function(data) {
	  output += data.toString();

	  // manually killing the process
	  if (/5002/.test(output)) {
	    killRunningProcesses(function(err) {
	      if (err) { console.log(err); }
	    });
	  }
	});

	forewoman.stderr.on('data', function(data) {
	  output += data.toString();
	});

	forewoman.on('exit', function(code) {
	  (/\[server1-0\] Server running at http\:\/\/127\.0\.0\.1\:5000/.test(output)).should.eql(true);
	  (/\[server1-1\] Server running at http\:\/\/127\.0\.0\.1\:5001/.test(output)).should.eql(true);
	  (/\[server2-0\] Server running at http\:\/\/127\.0\.0\.1\:5002/.test(output)).should.eql(true);
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

});