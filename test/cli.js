var forewoman = require('../lib/forewoman')
  . should = require('should');

/*
 * tests the command line options
 */
describe('CLI', function() {

  describe('start', function() {
    describe('with a non-existent Procfile', function() {
      it('should print an error', function() {
      });
    });

    describe('with a Procfile', function() {
      it('runs successfully', function() {
      });

      it('can run a single process', function() {
      });
    });

    describe('with an alternate root', function() {
      it('reads the Procfile from that root', function() {
      });
    });
  });

  describe('export', function() {
    describe('options', function() {
      it('uses .forewoman', function() {
      });

      it('respects .env', function() {
      });
    });

    describe('with a non-existent Procfile', function() {
      it('prints an error', function() {
      });
    });

    describe('with a Procfile', function() {
      describe('with a formatter with a generic error', function() {
	it('prints an error', function() {
	});
      });

      describe('with a valid config', function() {
	it('runs successfully', function() {
	});
      });
    });
  });

  describe('check', function() {
    describe('with a valid Procfile', function() {
      it('displays the jobs', function() {
      });
    });

    describe('with a blank Procfile', function() {
      it('displays an error', function() {
      });
    });

    describe('without a Procfile', function() {
      it('displays an error', function() {
      });
    });
  });

  describe('run', function() {
    describe('with a valid Procfile', function() {
      describe('and a command', function() {
	it('should load the environment file', function() {
	});

	it('should run the command as a string', function() {
	});
      });

      describe('and a non-existent command', function() {
	it('should print an error', function() {
	});
      });

      describe('and a non-executable command', function() {
	it('should print an error', function() {
	});
      });
    });
  });
});