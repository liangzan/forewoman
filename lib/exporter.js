var winston = require('winston').cli()
  , runit = require('./export/runit')
  , inittab = require('./export/inittab')
  , upstart = require('./export/upstart')
  , supervisord = require('./export/supervisord');

/*
 * exporter
 *
 * exports the procfile into the init formats
 *
 */
var exporter = exports;

/*
 * public functions
 */

/*
 * converts the procfile into the desired templates
 *
 * @param {obj} object of process name and its command
 * @param {obj} object of command line options
 * @callback {err} err
 */
exporter.writeTemplates = function(processes, cmdOptions, callback) {
  switch (cmdOptions.format) {
  case 'runit':
    return runit.writeTemplates(processes, cmdOptions, callback);
    break;
  case 'upstart':
    return upstart.writeTemplates(processes, cmdOptions, callback);
    break;
  case 'inittab':
    return inittab.writeTemplates(processes, cmdOptions, callback);
    break;
  case 'supervisord':
    return supervisord.writeTemplates(processes, cmdOptions, callback);
    break;
  default:
    return callback(new Error('Unknown format. Please select inittab, runit, '
			      + 'supervisord, upstart or monit'));
    break;
  }
};
