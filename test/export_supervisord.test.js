var exporter = require('../lib/exporter')
  , fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec
  , should = require('should')
  , async = require('async')
  , _ = require('underscore');

function defaultCmdOptions(opts) {
  return _.extend({
    format: 'supervisord',
    location: path.normalize(__dirname + '/../tmp'),
    concurrency: null,
    directory: null,
    app: path.basename(path.dirname(process.cwd())),
    user: path.basename(path.dirname(process.cwd())),
    template: null,
    log: null,
    port: 5000
  }, opts);
}

function verifyMasterTemplate(appName, contents, callback) {
  var processFilePath = __dirname + '/../tmp/' + appName + '.conf';
  path.existsSync(processFilePath).should.eql(true);
  fs.readFileSync(processFilePath, 'utf8').should.eql(contents);
  return callback(null);
}

function removeWrittenTemplates(appName, callback) {
  var cmd = 'rm ' + __dirname + '/../tmp/' + appName + '.conf';
  var rm = exec(cmd, function(err, stdout, stderr) {
    callback(err);
  });
}

describe('exporter', function() {
  describe('supervisord', function() {

    describe('given no options', function() {
      before(function(done) {
	removeWrittenTemplates('Projects', function(err) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      after(function(done) {
	removeWrittenTemplates('Projects', function(err) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      it('should build the template', function(done) {
	var procs = {
	  server1: 'node scripts/server.js',
	  server2: 'node scripts/server.js'
	};
	var cmdOptions = defaultCmdOptions({});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  var contents = "[program:Projects-server1]\n"
	  + "command=node scripts/server.js\n"
	  + "autostart=true\n"
	  + "autorestart=true\n"
	  + "stopsignal=QUIT\n"
	  + "stdout_logfile=/var/log/Projects/server1-0-out.log\n"
	  + "stderr_logfile=/var/log/Projects/server1-0-err.log\n"
	  + "user=Projects\n"
	  + "directory=" + process.cwd() + "\n"
	  + "environment=PORT=5000\n"
	  + "[program:Projects-server2]\n"
	  + "command=node scripts/server.js\n"
	  + "autostart=true\n"
	  + "autorestart=true\n"
	  + "stopsignal=QUIT\n"
	  + "stdout_logfile=/var/log/Projects/server2-0-out.log\n"
	  + "stderr_logfile=/var/log/Projects/server2-0-err.log\n"
	  + "user=Projects\n"
	  + "directory=" + process.cwd() + "\n"
	  + "environment=PORT=5000\n"
	  + "[group:Projects]\n"
	  + "programs=Projects,Projects";
	  verifyMasterTemplate('Projects', contents, function(err) {
	    done();
	  });
	});
      });
    });

    describe('given concurrent options', function() {
      before(function(done) {
	removeWrittenTemplates('Projects', function(err) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      after(function(done) {
	removeWrittenTemplates('Projects', function(err) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      it('should build the template', function(done) {
	var procs = {
	  server1: 'node scripts/server.js',
	  server2: 'node scripts/server.js'
	};
	var cmdOptions = defaultCmdOptions({
	  concurrency: 'server1=2'
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  var contents = "[program:Projects-server1]\n"
	  + "command=node scripts/server.js\n"
	  + "autostart=true\n"
	  + "autorestart=true\n"
	  + "stopsignal=QUIT\n"
	  + "stdout_logfile=/var/log/Projects/server1-0-out.log\n"
	  + "stderr_logfile=/var/log/Projects/server1-0-err.log\n"
	  + "user=Projects\n"
	  + "directory=" + process.cwd() + "\n"
	  + "environment=PORT=5000\n"
	  + "[program:Projects-server1-1]\n"
	  + "command=node scripts/server.js\n"
	  + "autostart=true\n"
	  + "autorestart=true\n"
	  + "stopsignal=QUIT\n"
	  + "stdout_logfile=/var/log/Projects/server1-1-out.log\n"
	  + "stderr_logfile=/var/log/Projects/server1-1-err.log\n"
	  + "user=Projects\n"
	  + "directory=" + process.cwd() + "\n"
	  + "environment=PORT=5000\n"
	  + "[program:Projects-server2]\n"
	  + "command=node scripts/server.js\n"
	  + "autostart=true\n"
	  + "autorestart=true\n"
	  + "stopsignal=QUIT\n"
	  + "stdout_logfile=/var/log/Projects/server2-0-out.log\n"
	  + "stderr_logfile=/var/log/Projects/server2-0-err.log\n"
	  + "user=Projects\n"
	  + "directory=" + process.cwd() + "\n"
	  + "environment=PORT=5000\n"
	  + "[group:Projects]\n"
	  + "programs=Projects,Projects,Projects";
	  verifyMasterTemplate('Projects', contents, function(err) {
	    done();
	  });
	});
      });
    });

    describe('given app options', function() {
      var appName = 'foo';

      before(function(done) {
	removeWrittenTemplates(appName, function(err) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      after(function(done) {
	removeWrittenTemplates(appName, function(err) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      it('should build the template', function(done) {
	var procs = {
	  server1: 'node scripts/server.js',
	  server2: 'node scripts/server.js'
	};

	var cmdOptions = defaultCmdOptions({
	  app: appName
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  var contents = "[program:foo-server1]\n"
	  + "command=node scripts/server.js\n"
	  + "autostart=true\n"
	  + "autorestart=true\n"
	  + "stopsignal=QUIT\n"
	  + "stdout_logfile=/var/log/foo/server1-0-out.log\n"
	  + "stderr_logfile=/var/log/foo/server1-0-err.log\n"
	  + "user=Projects\n"
	  + "directory=" + process.cwd() + "\n"
	  + "environment=PORT=5000\n"
	  + "[program:foo-server2]\n"
	  + "command=node scripts/server.js\n"
	  + "autostart=true\n"
	  + "autorestart=true\n"
	  + "stopsignal=QUIT\n"
	  + "stdout_logfile=/var/log/foo/server2-0-out.log\n"
	  + "stderr_logfile=/var/log/foo/server2-0-err.log\n"
	  + "user=Projects\n"
	  + "directory=" + process.cwd() + "\n"
	  + "environment=PORT=5000\n"
	  + "[group:foo]\n"
	  + "programs=foo,foo";
	  verifyMasterTemplate(appName, contents, function(err) {
	    done();
	  });
	});
      });
    });

    describe('given template options', function() {
      before(function(done) {
	removeWrittenTemplates('Projects', function(err) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      after(function(done) {
	removeWrittenTemplates('Projects', function(err) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      it('should build the template', function(done) {
	var procs = {
	  server1: 'node scripts/server.js',
	  server2: 'node scripts/server.js'
	};
	var cmdOptions = defaultCmdOptions({
	  template: 'app.conf=' + __dirname + '/fixtures/supervisord.alternate'
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  var contents = "[program:Projects-server1]\n"
	  + "command=node scripts/server.js\n"
	  + "autostart=false\n"
	  + "autorestart=true\n"
	  + "stopsignal=QUIT\n"
	  + "stdout_logfile=/var/log/Projects/server1-0-out.log\n"
	  + "stderr_logfile=/var/log/Projects/server1-0-err.log\n"
	  + "user=Projects\n"
	  + "directory=" + process.cwd() + "\n"
	  + "environment=PORT=5000\n"
	  + "[program:Projects-server2]\n"
	  + "command=node scripts/server.js\n"
	  + "autostart=false\n"
	  + "autorestart=true\n"
	  + "stopsignal=QUIT\n"
	  + "stdout_logfile=/var/log/Projects/server2-0-out.log\n"
	  + "stderr_logfile=/var/log/Projects/server2-0-err.log\n"
	  + "user=Projects\n"
	  + "directory=" + process.cwd() + "\n"
	  + "environment=PORT=5000\n"
	  + "[group:Projects]\n"
	  + "programs=Projects,Projects";
	  verifyMasterTemplate('Projects', contents, function(err) {
	    done();
	  });
	});
      });
    });

  });
});
