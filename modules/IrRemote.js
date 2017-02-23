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
  let listeners = [];
  logger.info('[IrRemote] Initializing LIRC');
  lircNode.init(function() {
    Object.keys(lircNode.remotes).forEach(function(remote) {
      logger.info('[IrRemote] Adding listeners for remote %s', remote);
      lircNode.remotes[remote].forEach(function(button) {
        logger.info('[IrRemote %s] Adding listener for button %s', remote, button);
        listeners.push(lircNode.addListener(button, remote, function(data) {
          if (data.repeat === '00') {
            self.emit('buttonPress', button);
          }
        }, 500));
      });
    });
  });
  this.stop = function() {
    Object.keys(lircNode.remotes).forEach(function(remote) {
      logger.info('[IrRemote] Removing listeners for remote');
      listeners.forEach(function(listener) {
        logger.info('[IrRemote] Removing listener %s', listener);
        lircNode.removeListener(listener);
      });
    });
  };
}

util.inherits(IrRemote, EventEmitter);
// Exports
module.exports = IrRemote;
