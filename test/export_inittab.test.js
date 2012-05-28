var exporter = require('../lib/exporter')
  , fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec
  , should = require('should')
  , async = require('async')
  , _ = require('underscore');

function defaultCmdOptions(opts) {
  return _.extend({
    format: 'inittab',
    location: path.normalize(__dirname + '/../tmp/inittab'),
    concurrency: null,
    directory: null,
    app: path.basename(path.dirname(process.cwd())),
    user: process.env.USER,
    template: null,
    log: path.normalize(__dirname + '/../tmp/log'),
    port: 5000
  }, opts);
}

function verifyMasterTemplate(contents, callback) {
  var processFilePath = __dirname + '/../tmp/inittab';
  path.existsSync(processFilePath).should.eql(true);
  fs.readFileSync(processFilePath, 'utf8').should.eql(contents);
  return callback(null);
}

function removeWrittenTemplates(callback) {
  var cmd = 'rm ' + __dirname + '/../tmp/inittab';
  var rm = exec(cmd, function(err, stdout, stderr) {
    callback(err);
  });
}

describe('exporter', function() {
  describe('inittab', function() {

    describe('given no options', function() {
      before(function(done) {
	removeWrittenTemplates(function(err) {
	  if (err) { console.log(err); }
	  done();
	});
      });

      after(function(done) {
	removeWrittenTemplates(function(err) {
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
	  var contents = "# ----- forewoman Projects processes -----\n"
	 + "SERVER10:4:respawn:/bin/su - " + process.env.USER + " -c 'PORT=5000 node scripts/server.js >> " + process.cwd() + "/tmp/log/server1-0.log 2>&1'\n"
	 + "SERVER20:4:respawn:/bin/su - " + process.env.USER + " -c 'PORT=5000 node scripts/server.js >> " + process.cwd() + "/tmp/log/server2-0.log 2>&1'\n"
	 + "# ----- end foreman Projects processes -----";
	  verifyMasterTemplate(contents, function(err) {
	    done();
	  });
	});
      });
    });

    describe('given concurrent options', function() {
      it('should build the template', function(done) {
	var procs = {
	  server1: 'node scripts/server.js',
	  server2: 'node scripts/server.js'
	};
	var cmdOptions = defaultCmdOptions({
	  concurrency: 'server1=2'
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  var contents = "# ----- forewoman Projects processes -----\n"
	 + "SERVER10:4:respawn:/bin/su - " + process.env.USER + " -c 'PORT=5000 node scripts/server.js >> " + process.cwd() + "/tmp/log/server1-0.log 2>&1'\n"
	 + "SERVER11:4:respawn:/bin/su - " + process.env.USER + " -c 'PORT=5000 node scripts/server.js >> " + process.cwd() + "/tmp/log/server1-1.log 2>&1'\n"
	 + "SERVER20:4:respawn:/bin/su - " + process.env.USER + " -c 'PORT=5000 node scripts/server.js >> " + process.cwd() + "/tmp/log/server2-0.log 2>&1'\n"
	 + "# ----- end foreman Projects processes -----";
	  verifyMasterTemplate(contents, function(err) {
	    done();
	  });
	});
      });
    });


    describe('given app options', function() {
      it('should build the template', function(done) {
	var appName = 'foo';
	var procs = {
	  server1: 'node scripts/server.js',
	  server2: 'node scripts/server.js'
	};
	var cmdOptions = defaultCmdOptions({
	  app: appName
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  var contents = "# ----- forewoman " + appName + " processes -----\n"
	 + "SERVER10:4:respawn:/bin/su - " + process.env.USER + " -c 'PORT=5000 node scripts/server.js >> " + process.cwd() + "/tmp/log/server1-0.log 2>&1'\n"
	 + "SERVER20:4:respawn:/bin/su - " + process.env.USER + " -c 'PORT=5000 node scripts/server.js >> " + process.cwd() + "/tmp/log/server2-0.log 2>&1'\n"
	 + "# ----- end foreman " + appName + " processes -----";
	  verifyMasterTemplate(contents, function(err) {
	    done();
	  });
	});
      });
    });

    describe('given template options', function() {
      it('should build the template', function(done) {
	var procs = {
	  server1: 'node scripts/server.js',
	  server2: 'node scripts/server.js'
	};
	var cmdOptions = defaultCmdOptions({
	  template: 'master=' + __dirname + '/fixtures/inittab.alternate'
	});

	exporter.writeTemplates(procs, cmdOptions, function(err) {
	  var contents = "# ----- forewoman alternate Projects processes -----\n"
	 + "SERVER10:4:respawn:/bin/su - " + process.env.USER + " -c 'PORT=5000 node scripts/server.js >> " + process.cwd() + "/tmp/log/server1-0.log 2>&1'\n"
	 + "SERVER20:4:respawn:/bin/su - " + process.env.USER + " -c 'PORT=5000 node scripts/server.js >> " + process.cwd() + "/tmp/log/server2-0.log 2>&1'\n"
	 + "# ----- end foreman alternate Projects processes -----";
	  verifyMasterTemplate(contents, function(err) {
	    done();
	  });
	});
      });
    });

  });
});