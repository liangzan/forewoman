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

function verifyEnvPort(procName, portNumber, callback) {
  var portFilePath = __dirname + '/../tmp/' + procName + '/env/PORT';
  var fileExists = path.existsSync(portFilePath).should.eql(true);
  var contentExists = fs.readFileSync(portFilePath, 'utf8').should.eql(portNumber);
  return callback(null, fileExists && contentExists);
}

function verifyRunTemplate(procName, contents, callback) {
  var runFilePath = __dirname + '/../tmp/' + procName + '/run';
  var fileExists = path.existsSync(runFilePath).should.eql(true);
  var contentExists = fs.readFileSync(runFilePath, 'utf8').should.eql(contents);
  return callback(null, fileExists && contentExists);
}

function verifyLogRunTemplate(procName, contents, callback) {
  var logRunFilePath = __dirname + '/../tmp/' + procName + '/log/run';
  var fileExists = path.existsSync(logRunFilePath).should.eql(true);
  var contentExists = fs.readFileSync(logRunFilePath, 'utf8').should.eql(contents);
  return callback(null, fileExists && contentExists);
}

function removeWrittenTemplates(procName, callback) {
  var cmd = 'rm -rf ' + __dirname + '/../tmp/' + procName + '-server*';
  var rm = exec(cmd, function(err, stdout, stderr) {
    callback(err);
  });
}

describe('exporter', function() {
  describe('runit', function() {

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
	  server1: 'node script.js',
	  server2: 'node script.js'
	};
	var cmdOptions = defaultCmdOptions({
	  format: 'runit',
	  location: __dirname + '/../tmp'
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  async.series([
	    function(procOneEnvCallback) {
	      return verifyEnvPort('Projects-server1-0', '5000', procOneEnvCallback);
	    },

	    function(procTwoEnvCallback) {
	      return verifyEnvPort('Projects-server2-0', '5000', procTwoEnvCallback);
	    },

	    function(procOneRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + appName + " -e " + process.cwd()
	     + "/tmp/Projects-server1-0/env node script.js";
	      return verifyRunTemplate('Projects-server1-0', contents, procOneRunCallback);
	    },

	    function(procTwoRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + appName + " -e " + process.cwd()
	     + "/tmp/Projects-server2-0/env node script.js";
	      return verifyRunTemplate('Projects-server2-0', contents, procTwoRunCallback);
	    },

	    function(procOneLogRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=/var/log/" + appName + "/server1-0\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + appName + " \"$LOG\"\n"
	     + "exec chpst -u " + appName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('Projects-server1-0', contents, procOneLogRunCallback);
	    },

	    function(procTwoLogRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=/var/log/" + appName + "/server2-0\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + appName + " \"$LOG\"\n"
	     + "exec chpst -u " + appName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('Projects-server2-0', contents, procTwoLogRunCallback);
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
	  server1: 'node script.js',
	  server2: 'node script.js'
	};
	var cmdOptions = defaultCmdOptions({
	  format: 'runit',
	  location: __dirname + '/../tmp',
	  concurrency: 'server1=2'
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  async.series([
	    function(procOneZeroEnvCallback) {
	      return verifyEnvPort('Projects-server1-0', '5000', procOneZeroEnvCallback);
	    },

	    function(procOneOneEnvCallback) {
	      return verifyEnvPort('Projects-server1-1', '5000', procOneOneEnvCallback);
	    },

	    function(procTwoEnvCallback) {
	      return verifyEnvPort('Projects-server2-0', '5000', procTwoEnvCallback);
	    },

	    function(procOneZeroRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + appName + " -e " + process.cwd()
	     + "/tmp/Projects-server1-0/env node script.js";
	      return verifyRunTemplate('Projects-server1-0', contents, procOneZeroRunCallback);
	    },

	    function(procOneOneRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + appName + " -e " + process.cwd()
	     + "/tmp/Projects-server1-1/env node script.js";
	      return verifyRunTemplate('Projects-server1-1', contents, procOneOneRunCallback);
	    },

	    function(procTwoRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + appName + " -e " + process.cwd()
	     + "/tmp/Projects-server2-0/env node script.js";
	      return verifyRunTemplate('Projects-server2-0', contents, procTwoRunCallback);
	    },

	    function(procOneZeroLogRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=/var/log/" + appName + "/server1-0\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + appName + " \"$LOG\"\n"
	     + "exec chpst -u " + appName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('Projects-server1-0', contents, procOneZeroLogRunCallback);
	    },

	    function(procOneOneLogRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=/var/log/" + appName + "/server1-1\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + appName + " \"$LOG\"\n"
	     + "exec chpst -u " + appName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('Projects-server1-1', contents, procOneOneLogRunCallback);
	    },

	    function(procTwoLogRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=/var/log/" + appName + "/server2-0\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + appName + " \"$LOG\"\n"
	     + "exec chpst -u " + appName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('Projects-server2-0', contents, procTwoLogRunCallback);
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
	  server1: 'node script.js',
	  server2: 'node script.js'
	};
	var cmdOptions = defaultCmdOptions({
	  format: 'runit',
	  location: __dirname + '/../tmp',
	  app: appName,
	  user: appName
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  async.series([
	    function(procOneEnvCallback) {
	      return verifyEnvPort('foo-server1-0', '5000', procOneEnvCallback);
	    },

	    function(procTwoEnvCallback) {
	      return verifyEnvPort('foo-server2-0', '5000', procTwoEnvCallback);
	    },

	    function(procOneRunCallback) {
	      var contents = "#!/bin/sh\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + appName + " -e " + process.cwd()
	     + "/tmp/foo-server1-0/env node script.js";
	      return verifyRunTemplate('foo-server1-0', contents, procOneRunCallback);
	    },

	    function(procTwoRunCallback) {
	      var contents = "#!/bin/sh\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + appName + " -e " + process.cwd()
	     + "/tmp/foo-server2-0/env node script.js";
	      return verifyRunTemplate('foo-server2-0', contents, procTwoRunCallback);
	    },

	    function(procOneLogRunCallback) {
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=/var/log/" + appName + "/server1-0\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + appName + " \"$LOG\"\n"
	     + "exec chpst -u " + appName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('foo-server1-0', contents, procOneLogRunCallback);
	    },

	    function(procTwoLogRunCallback) {
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=/var/log/" + appName + "/server2-0\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + appName + " \"$LOG\"\n"
	     + "exec chpst -u " + appName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('foo-server2-0', contents, procTwoLogRunCallback);
	    }
	  ], function(err, results) {
	    done();
	  });
	});
      });
    });

    describe('given log option', function() {
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
	var log = '/foo/bar/';
	var procs = {
	  server1: 'node script.js',
	  server2: 'node script.js'
	};
	var cmdOptions = defaultCmdOptions({
	  format: 'runit',
	  location: __dirname + '/../tmp',
	  log: log
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  async.series([
	    function(procOneEnvCallback) {
	      return verifyEnvPort('Projects-server1-0', '5000', procOneEnvCallback);
	    },

	    function(procTwoEnvCallback) {
	      return verifyEnvPort('Projects-server2-0', '5000', procTwoEnvCallback);
	    },

	    function(procOneRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + appName + " -e " + process.cwd()
	     + "/tmp/Projects-server1-0/env node script.js";
	      return verifyRunTemplate('Projects-server1-0', contents, procOneRunCallback);
	    },

	    function(procTwoRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + appName + " -e " + process.cwd()
	     + "/tmp/Projects-server2-0/env node script.js";
	      return verifyRunTemplate('Projects-server2-0', contents, procTwoRunCallback);
	    },

	    function(procOneLogRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=" + log + "/server1-0\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + appName + " \"$LOG\"\n"
	     + "exec chpst -u " + appName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('Projects-server1-0', contents, procOneLogRunCallback);
	    },

	    function(procTwoLogRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=" + log + "/server2-0\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + appName + " \"$LOG\"\n"
	     + "exec chpst -u " + appName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('Projects-server2-0', contents, procTwoLogRunCallback);
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
	  server1: 'node script.js',
	  server2: 'node script.js'
	};
	var cmdOptions = defaultCmdOptions({
	  format: 'runit',
	  location: __dirname + '/../tmp',
	  user: userName
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  async.series([
	    function(procOneEnvCallback) {
	      return verifyEnvPort('Projects-server1-0', '5000', procOneEnvCallback);
	    },

	    function(procTwoEnvCallback) {
	      return verifyEnvPort('Projects-server2-0', '5000', procTwoEnvCallback);
	    },

	    function(procOneRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + userName + " -e " + process.cwd()
	     + "/tmp/Projects-server1-0/env node script.js";
	      return verifyRunTemplate('Projects-server1-0', contents, procOneRunCallback);
	    },

	    function(procTwoRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + userName + " -e " + process.cwd()
	     + "/tmp/Projects-server2-0/env node script.js";
	      return verifyRunTemplate('Projects-server2-0', contents, procTwoRunCallback);
	    },

	    function(procOneLogRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=/var/log/" + appName + "/server1-0\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + userName + " \"$LOG\"\n"
	     + "exec chpst -u " + userName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('Projects-server1-0', contents, procOneLogRunCallback);
	    },

	    function(procTwoLogRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=/var/log/" + appName + "/server2-0\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + userName + " \"$LOG\"\n"
	     + "exec chpst -u " + userName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('Projects-server2-0', contents, procTwoLogRunCallback);
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
	  server1: 'node script.js',
	  server2: 'node script.js'
	};
	var cmdOptions = defaultCmdOptions({
	  format: 'runit',
	  location: __dirname + '/../tmp',
	  template: 'run=' + __dirname + '/fixtures/runit_run.alternate'
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  async.series([
	    function(procOneEnvCallback) {
	      return verifyEnvPort('Projects-server1-0', '5000', procOneEnvCallback);
	    },

	    function(procTwoEnvCallback) {
	      return verifyEnvPort('Projects-server2-0', '5000', procTwoEnvCallback);
	    },

	    function(procOneRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/bash\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + appName + " -e " + process.cwd()
	     + "/tmp/Projects-server1-0/env node script.js";
	      return verifyRunTemplate('Projects-server1-0', contents, procOneRunCallback);
	    },

	    function(procTwoRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/bash\n"
	     + "cd " + process.cwd() + "\n"
	     + "exec chpst -u " + appName + " -e " + process.cwd()
	     + "/tmp/Projects-server2-0/env node script.js";
	      return verifyRunTemplate('Projects-server2-0', contents, procTwoRunCallback);
	    },

	    function(procOneLogRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=/var/log/" + appName + "/server1-0\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + appName + " \"$LOG\"\n"
	     + "exec chpst -u " + appName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('Projects-server1-0', contents, procOneLogRunCallback);
	    },

	    function(procTwoLogRunCallback) {
	      var appName = path.basename(path.dirname(process.cwd()));
	      var contents = "#!/bin/sh\n"
	     + "set -e\n"
	     + "LOG=/var/log/" + appName + "/server2-0\n"
	     + "test -d \"$LOG\" || mkdir -p m2750 \"$LOG\" && chown " + appName + " \"$LOG\"\n"
	     + "exec chpst -u " + appName + " svlogd \"$LOG\"";
	      return verifyLogRunTemplate('Projects-server2-0', contents, procTwoLogRunCallback);
	    }
	  ], function(err, results) {
	    done();
	  });
	});
      });
    });
  });

});
