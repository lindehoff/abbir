/**
 * Module for IR Remote
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const lircNode = require('lirc_node');

function IrRemote(config, logger) {
  EventEmitter.call(this);
  const self = this;
  logger.info('[IrRemote] Initializing LIRC');
  lircNode.init(function() {
    Object.keys(lircNode.remotes).forEach(function(remote) {
      logger.info('[IrRemote] Adding listeners for remote %s', remote);
      lircNode.remotes[remote].forEach(function(button) {
        logger.info('[IrRemote %s] Adding listener for button %s', remote, button);
        lircNode.addListener(button, remote, function(data) {
          if (data.repeat === '00') {
              self.emit('buttonPress', button);
            }
          }, 500);
      });
    });
  });
}

util.inherits(IrRemote, EventEmitter);
// Exports
module.exports = IrRemote;
