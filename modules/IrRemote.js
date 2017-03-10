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
const logger = require('winston');
const Settings = require('./Settings');
const config = Settings.config;

function IrRemote() {
  EventEmitter.call(this);
  const self = this;
  let listeners = [];
  logger.info('[IrRemote] Initializing LIRC');
  lircNode.init(function() {
    Object.keys(lircNode.remotes).forEach(function(remote) {
      logger.info('[IrRemote] Adding listeners for remote %s', remote);
      lircNode.remotes[remote].forEach(function(button) {
        logger.info('[IrRemote %s] Adding listener for button %s',
          remote, button);
        listeners.push(lircNode.addListener(button, remote, function(data) {
          if (data.repeat === '00') {
            self.emit('buttonPress', button);
          }
        }, 500));
      });
    });
  });

  this.close = () => new Promise((resolve, reject) => {
    Object.keys(lircNode.remotes).forEach(function(remote) {
      logger.info('[IrRemote] Removing listeners for remote %s', remote);
      listeners.forEach(function(listener) {
        logger.info('[IrRemote %s] Removing listener %s', remote, listener);
        lircNode.removeListener(listener);
      });
      resolve('success');
    });
  });
  Settings.addCleanUpPromise(this.close);
}

util.inherits(IrRemote, EventEmitter);
// Exports
module.exports = IrRemote;
