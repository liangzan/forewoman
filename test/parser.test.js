var parser = require('../lib/parser')
  , fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec
  , should = require('should')
  , async = require('async')
  , _ = require('underscore');

/*
 * tests the parser
 */
var fixturesDir = __dirname + '/fixtures/';
var workingDir = process.cwd();

describe('parser', function() {

  describe('for a procfile', function(done) {
    it('should return the procfile contents as an object', function(done) {
      var fileContent = "server1: node path/to/foo.js\nserver2: node path/to/bar.js";
      parser.parseProcfile(fileContent, function(procOpts) {
	procOpts.should.eql({
	  'server1': 'node path/to/foo.js',
	  'server2': 'node path/to/bar.js'
	});
	done();
      });
    });
  });

  describe('for concurrency cli options', function() {
    it('should return the options as an object', function(done) {
      var cmdOptions = {concurrency: 'server1=2,server2=5'};
      var parsedOpt = parser.parseConcurrencyOpts(cmdOptions);
      parsedOpt.should.eql({
	'server1': 2,
	'server2': 5
      });
      done();
    });
  });

  describe('for template cli options', function() {
    it('should return the options as an object', function(done) {
      var templateOpt = 'run=/path/to/run.mustache,log_run=another/path/to/alt.mustache';
      var parsedOpt = parser.parseTemplateOpts(templateOpt);
      parsedOpt.should.eql({
	run: '/path/to/run.mustache',
	log_run: 'another/path/to/alt.mustache'
      });
      done();
    });
  });

  describe('for environment cli options', function() {
    before(function(done) {
      var cmd = 'cp ' + fixturesDir + 'env ' + workingDir + '/.env';
      var cp = exec(cmd, function(err, stdout, stderr) {
	if (err) { console.log(err); }
	done();
      });
    });

    after(function(done) {
      var cmd = 'rm ' + workingDir + '/.env';
      var rm = exec(cmd, function(err, stdout, stderr) {
	if (err) { console.log(err); }
	done();
      });
    });

    it('should return the options as an object', function(done) {
      var parsedOpt = parser.parseEnvOpts({});
      parsedOpt.should.eql({
	'SERVER_MSG': 'I am the server. I listen to port:'
      });
      done();
    });
  });

  describe('for working directory cli options', function() {
    it('should return the normalized working directory', function(done) {
      var cmdOptions = {directory: 'scripts'};
      var parsedOpt = parser.cmdWorkingDir(cmdOptions);
      parsedOpt.should.eql('scripts');
      done();
    });

    it('should return the current working directory', function(done) {
      var parsedOpt = parser.cmdWorkingDir({});
      parsedOpt.should.eql(process.cwd());
      done();
    });

    it('should return the procfile working directory', function(done) {
      var cmdOptions = {procfile: fixturesDir + 'Procfile'};
      var parsedOpt = parser.cmdWorkingDir(cmdOptions);
      fixturesDir.should.eql(parsedOpt + '/');
      done();
    });
  });

  describe('for watch files cli options', function() {
    it('should return the options as an object', function(done) {
      var cmdOptions = {watch: 'server1=scripts/server.js,server2=scripts/server.js'};
      var parsedOpt = parser.parseWatchFileOpts(cmdOptions);
      parsedOpt.should.eql({
	'server1': process.cwd() + '/scripts/server.js',
	'server2': process.cwd() + '/scripts/server.js'
      });
      done();
    });
  });

  describe('for running child processes', function() {
    it('should return an array of running processes that matches the process name', function(done) {
      var processName = 'server1';
      var childProcs = {
	'server1-0': 'foo',
	'server1-1': 'bar',
	'server1-2': 'baz',
	'server2-0': 'boo',
	'server2-1': 'far',
	'server2-2': 'faz'
      };
      var parsedOpt = parser.matchingProcesses(processName, childProcs);
      parsedOpt.should.eql(['server1-0', 'server1-1', 'server1-2']);
      done();
    });
  });

  describe('for inline variables in a command', function() {
    it('should return the options as an object', function(done) {
      var command = 'FOO=1 bar=2 TAR=pink node BIN=5 foo.js HOO=har';
      var parsedOpt = parser.parseInlineVariables(command);
      parsedOpt.should.eql({
	bar: '2',
	TAR: 'pink',
	BIN: '5',
	FOO: '1',
	HOO: 'har'
      });
      done();
    });
  });

});