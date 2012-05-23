var exporter = require('../lib/exporter')
  , fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec
  , should = require('should')
  , async = require('async')
  , _ = require('underscore');

function defaultCmdOptions(opts) {
  return _.extend({
    format: null,
    location: null,
    concurrency: null,
    directory: null,
    app: path.basename(path.dirname(process.cwd())),
    user: path.basename(path.dirname(process.cwd())),
    template: null,
    log: null,
    port: 5000
  }, opts);
}

function verifyProcessTemplate(app, procName, index, contents, callback) {
  var processFilePath = __dirname + '/../tmp/' + app + '-' + procName + '-' + index + '.conf';
  path.existsSync(processFilePath).should.eql(true);
  fs.readFileSync(processFilePath, 'utf8').should.eql(contents);
  return callback(null);
}

function verifyMasterTemplate(contents, callback) {
  var masterFilePath = __dirname + '/../tmp/master.conf';
  path.existsSync(masterFilePath).should.eql(true);
  fs.readFileSync(masterFilePath, 'utf8').should.eql(contents);
  return callback(null);
}

function verifyProcessMasterTemplate(app, procName, contents, callback) {
  var processMasterFilePath = __dirname + '/../tmp/' + app + '-' + procName + '.conf';
  path.existsSync(processMasterFilePath).should.eql(true);
  fs.readFileSync(processMasterFilePath, 'utf8').should.eql(contents);
  return callback(null);
}

function removeWrittenTemplates(app, callback) {
  var cmd = 'rm -rf ' + __dirname + '/../tmp/' + app + '-server* ' + __dirname + '/../tmp/master.conf';
  var rm = exec(cmd, function(err, stdout, stderr) {
    callback(err);
  });
}

describe('exporter', function() {
  describe('upstart', function() {

    describe('given no options and a location', function() {
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

      it('should build the templates', function(done) {
	var procs = {
	  server1: 'node scripts/server.js',
	  server2: 'node scripts/server.js'
	};
	var cmdOptions = defaultCmdOptions({
	  format: 'upstart',
	  log: path.normalize(__dirname + '/../tmp/log'),
	  location: path.normalize(__dirname + '/../tmp')
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  async.series([
	    function(masterCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "pre-start script\n"
	      + "bash << \"EOF\"\n"
	      + "  mkdir -p " + process.cwd() + "/tmp/log\n"
	      + "  chown -R " + appName + " " + process.cwd() + "/tmp/log\n"
	      + "EOF\n"
	      + "end script";
	      return verifyMasterTemplate(contents, masterCallback);
	    },

	    function(processOneMasterCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "\n"
	      + "stop on stopping " + appName;
	      return verifyProcessMasterTemplate(appName, 'server1', contents, processOneMasterCallback);
	    },

	    function(processTwoMasterCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "\n"
	      + "stop on stopping " + appName;
	      return verifyProcessMasterTemplate(appName, 'server2', contents, processTwoMasterCallback);
	    },

	    function(processOneCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "-server1\n"
	      + "stop on stopping " + appName + "-server1\n"
	      + "respawn\n"
	      + "exec su -  -c 'cd " + process.cwd() + "; node scripts/server.js >> " + process.cwd() + "/tmp/log/server1-0.log 2>&1'";
	      return verifyProcessTemplate(appName, 'server1', 0, contents, processOneCallback);
	    },

	    function(processTwoCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "-server2\n"
	      + "stop on stopping " + appName + "-server2\n"
	      + "respawn\n"
	      + "exec su -  -c 'cd " + process.cwd() + "; node scripts/server.js >> " + process.cwd() + "/tmp/log/server2-0.log 2>&1'";
	      return verifyProcessTemplate(appName, 'server2', 0, contents, processTwoCallback);
	    }

	  ], function(err, results) {
	    done();
	  });
	});
      });
    });

    describe('given concurrent option', function() {
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

      it('should build the templates', function(done) {
	var procs = {
	  server1: 'node scripts/server.js',
	  server2: 'node scripts/server.js'
	};
	var cmdOptions = defaultCmdOptions({
	  format: 'upstart',
	  log: path.normalize(__dirname + '/../tmp/log'),
	  location: __dirname + '/../tmp',
	  concurrency: 'server1=2'
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  async.series([
	    function(masterCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "pre-start script\n"
	      + "bash << \"EOF\"\n"
	      + "  mkdir -p " + process.cwd() + "/tmp/log\n"
	      + "  chown -R " + appName + " " + process.cwd() + "/tmp/log\n"
	      + "EOF\n"
	      + "end script";
	      return verifyMasterTemplate(contents, masterCallback);
	    },

	    function(processOneMasterCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "\n"
	      + "stop on stopping " + appName;
	      return verifyProcessMasterTemplate(appName, 'server1', contents, processOneMasterCallback);
	    },

	    function(processTwoMasterCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "\n"
	      + "stop on stopping " + appName;
	      return verifyProcessMasterTemplate(appName, 'server2', contents, processTwoMasterCallback);
	    },

	    function(processOneZeroCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "-server1\n"
	      + "stop on stopping " + appName + "-server1\n"
	      + "respawn\n"
	      + "exec su -  -c 'cd " + process.cwd() + "; node scripts/server.js >> " + process.cwd() + "/tmp/log/server1-0.log 2>&1'";
	      return verifyProcessTemplate(appName, 'server1', 0, contents, processOneZeroCallback);
	    },

	    function(processOneOneCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "-server1\n"
	      + "stop on stopping " + appName + "-server1\n"
	      + "respawn\n"
	      + "exec su -  -c 'cd " + process.cwd() + "; node scripts/server.js >> " + process.cwd() + "/tmp/log/server1-1.log 2>&1'";
	      return verifyProcessTemplate(appName, 'server1', 1, contents, processOneOneCallback);
	    },

	    function(processTwoCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "-server2\n"
	      + "stop on stopping " + appName + "-server2\n"
	      + "respawn\n"
	      + "exec su -  -c 'cd " + process.cwd() + "; node scripts/server.js >> " + process.cwd() + "/tmp/log/server2-0.log 2>&1'";
	      return verifyProcessTemplate(appName, 'server2', 0, contents, processTwoCallback);
	    }

	  ], function(err, results) {
	    done();
	  });
	});
      });
    });

    describe('given app option', function() {
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

      it('should build the templates', function(done) {
	var procs = {
	  server1: 'node scripts/server.js',
	  server2: 'node scripts/server.js'
	};
	var cmdOptions = defaultCmdOptions({
	  format: 'upstart',
	  log: path.normalize(__dirname + '/../tmp/log'),
	  location: __dirname + '/../tmp',
	  app: appName,
	  user: appName
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  async.series([
	    function(masterCallback) {
	      var appName = 'foo';
	      var contents = "pre-start script\n"
	      + "bash << \"EOF\"\n"
	      + "  mkdir -p " + process.cwd() + "/tmp/log\n"
	      + "  chown -R " + appName + " " + process.cwd() + "/tmp/log\n"
	      + "EOF\n"
	      + "end script";
	      return verifyMasterTemplate(contents, masterCallback);
	    },

	    function(processOneMasterCallback) {
	      var appName = 'foo';
	      var contents = "start on starting " + appName + "\n"
	      + "stop on stopping " + appName;
	      return verifyProcessMasterTemplate(appName, 'server1', contents, processOneMasterCallback);
	    },

	    function(processTwoMasterCallback) {
	      var appName = 'foo';
	      var contents = "start on starting " + appName + "\n"
	      + "stop on stopping " + appName;
	      return verifyProcessMasterTemplate(appName, 'server2', contents, processTwoMasterCallback);
	    },

	    function(processOneCallback) {
	      var appName = 'foo';
	      var contents = "start on starting " + appName + "-server1\n"
	      + "stop on stopping " + appName + "-server1\n"
	      + "respawn\n"
	      + "exec su -  -c 'cd " + process.cwd() + "; node scripts/server.js >> " + process.cwd() + "/tmp/log/server1-0.log 2>&1'";
	      return verifyProcessTemplate(appName, 'server1', 0, contents, processOneCallback);
	    },

	    function(processTwoCallback) {
	      var appName = 'foo';
	      var contents = "start on starting " + appName + "-server2\n"
	      + "stop on stopping " + appName + "-server2\n"
	      + "respawn\n"
	      + "exec su -  -c 'cd " + process.cwd() + "; node scripts/server.js >> " + process.cwd() + "/tmp/log/server2-0.log 2>&1'";
	      return verifyProcessTemplate(appName, 'server2', 0, contents, processTwoCallback);
	    }
	  ], function(err, results) {
	    done();
	  });
	});
      });
    });

    describe('given user option', function() {
      var userName = 'foo';
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

      it('should build the templates', function(done) {
	var procs = {
	  server1: 'node scripts/server.js',
	  server2: 'node scripts/server.js'
	};
	var cmdOptions = defaultCmdOptions({
	  format: 'upstart',
	  log: path.normalize(__dirname + '/../tmp/log'),
	  location: __dirname + '/../tmp',
	  user: userName
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  async.series([
	    function(masterCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var user = 'foo';
	      var contents = "pre-start script\n"
	      + "bash << \"EOF\"\n"
	      + "  mkdir -p " + process.cwd() + "/tmp/log\n"
	      + "  chown -R " + user + " " + process.cwd() + "/tmp/log\n"
	      + "EOF\n"
	      + "end script";
	      return verifyMasterTemplate(contents, masterCallback);
	    },

	    function(processOneMasterCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "\n"
	      + "stop on stopping " + appName;
	      return verifyProcessMasterTemplate(appName, 'server1', contents, processOneMasterCallback);
	    },

	    function(processTwoMasterCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "\n"
	      + "stop on stopping " + appName;
	      return verifyProcessMasterTemplate(appName, 'server2', contents, processTwoMasterCallback);
	    },

	    function(processOneCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "-server1\n"
	      + "stop on stopping " + appName + "-server1\n"
	      + "respawn\n"
	      + "exec su -  -c 'cd " + process.cwd() + "; node scripts/server.js >> " + process.cwd() + "/tmp/log/server1-0.log 2>&1'";
	      return verifyProcessTemplate(appName, 'server1', 0, contents, processOneCallback);
	    },

	    function(processTwoCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "-server2\n"
	      + "stop on stopping " + appName + "-server2\n"
	      + "respawn\n"
	      + "exec su -  -c 'cd " + process.cwd() + "; node scripts/server.js >> " + process.cwd() + "/tmp/log/server2-0.log 2>&1'";
	      return verifyProcessTemplate(appName, 'server2', 0, contents, processTwoCallback);
	    }

	  ], function(err, results) {
	    done();
	  });
	});
      });
    });

    describe('given template option', function() {
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

      it('should build the templates', function(done) {
	var procs = {
	  server1: 'node scripts/server.js',
	  server2: 'node scripts/server.js'
	};
	var cmdOptions = defaultCmdOptions({
	  format: 'upstart',
	  log: path.normalize(__dirname + '/../tmp/log'),
	  location: __dirname + '/../tmp',
	  template: 'master.conf=' + __dirname + '/fixtures/upstart_master.alternate'
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  async.series([
	    function(masterCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "pre-start script\n"
	      + "bash << \"EOF\"\n"
	      + "mkdir -p " + process.cwd() + "/tmp/log\n"
	      + "chown -R " + appName + " " + process.cwd() + "/tmp/log\n"
	      + "EOF\n"
	      + "end script";
	      return verifyMasterTemplate(contents, masterCallback);
	    },

	    function(processOneMasterCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "\n"
	      + "stop on stopping " + appName;
	      return verifyProcessMasterTemplate(appName, 'server1', contents, processOneMasterCallback);
	    },

	    function(processTwoMasterCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "\n"
	      + "stop on stopping " + appName;
	      return verifyProcessMasterTemplate(appName, 'server2', contents, processTwoMasterCallback);
	    },

	    function(processOneCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "-server1\n"
	      + "stop on stopping " + appName + "-server1\n"
	      + "respawn\n"
	      + "exec su -  -c 'cd " + process.cwd() + "; node scripts/server.js >> " + process.cwd() + "/tmp/log/server1-0.log 2>&1'";
	      return verifyProcessTemplate(appName, 'server1', 0, contents, processOneCallback);
	    },

	    function(processTwoCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "start on starting " + appName + "-server2\n"
	      + "stop on stopping " + appName + "-server2\n"
	      + "respawn\n"
	      + "exec su -  -c 'cd " + process.cwd() + "; node scripts/server.js >> " + process.cwd() + "/tmp/log/server2-0.log 2>&1'";
	      return verifyProcessTemplate(appName, 'server2', 0, contents, processTwoCallback);
	    }

	  ], function(err, results) {
	    done();
	  });
	});
      });
    });

  }); // upstart
}); // exporter
