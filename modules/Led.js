/**
 * Module for Led
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
const fs = require('fs');
const piBlasterPath = '/dev/pi-blaster';
const util = require('util');
const logger = require('winston');
const Settings = require('./Settings');

function writeToPiBlaster(cmd, callback) {
  const buffer = new Buffer(cmd + '\n');
  let fd = fs.open(piBlasterPath, 'w', function(err, fd) {
    if (err) {
      callback(err);
      return;
    } else {
      fs.write(fd, buffer, 0, buffer.length, -1, function(err) {
        if (err) {
          callback(error);
          return;
        } else {
          fs.close(fd, function(err) {
            if (err) {
              callback(error);
              return;
            }
            callback();
          });
        }
      });
    }
  });
}

function Led(gpioPin) {
  logger.info('[LED %d] Initializing LED on GPIO %d', gpioPin, gpioPin);
  const pin = gpioPin;
  let pulse = false;
  let fadeInterval;
  Object.defineProperties(this, {
    'pulsing': {
      'get': function() {
        return pulse;
      }
    }
  });
  const setPin = function(value) {
    logger.debug('[LED %d] Setting pin to %d', pin, value);
    writeToPiBlaster(util.format('%d=%d', pin, value), function(err) {
      if (err) {
        logger.error('[LED %d] Unable to set pin to  %d, error: ',
          pin, value, err);
        return;
      }
      logger.debug('[LED %d] Pin set to %d', pin, value);
    });
  };
  this.setBrightness = function(brightness) {
    if (this.pulsing) {
      this.stopPulse();
    }
    setPin(pin, brightness);
  };
  this.turnOn = function() {
    if (this.pulsing) {
      this.stopPulse();
    }
    setPin(1);
  };
  this.turnOff = function() {
    if (this.pulsing) {
      this.stopPulse();
    }
    setPin(0);
  };
  this.fade = function(from, to, step, time, callback) {
    let curr = from;
    logger.debug('[LED %d] Starting to fade for %d', gpioPin, time);
    fadeInterval = setInterval(function() {
      if ((from < to && curr <= to) || (from > to && curr >= to)) {
        writeToPiBlaster(util.format('%d=%d', pin, curr), function(err) {
          if (err) {
            clearInterval(fadeInterval);
            callback(err);
            return;
          }
          if (from < to) {
            curr += step;
          } else {
            curr -= step;
          }
        });
      } else {
        logger.debug('[LED %d] fading done', gpioPin);
        clearInterval(fadeInterval);
        callback();
      }
    }, time / 100);
  };
  this.fadeUp = function(time, step = 0.01, callback = () => {}) {
    this.fade(0.0, 1.0, step, time, callback);
  };
  this.fadeDown = function(time, step = 0.01, callback = () => {}) {
    this.fade(1.0, 0.0, step, time, callback);
  };
  this.startPulse = function(speed) {
    pulse = true;
    let self = this;
    logger.debug('[LED %d] Starting pulse', gpioPin);
    self.fadeUp(speed / 2, 0.01, function(err) {
      if (err) {
        logger.error('[LED %d] Pulse error: ', gpioPin, err);
        pulse = false;
        return;
      }
      self.fadeDown(speed / 2, 0.01, function(err) {
        if (err) {
          logger.error('[LED %d] Pulse error: ', gpioPin, err);
          pulse = false;
          return;
        }
        if (pulse) {
          setTimeout(function() {
            self.startPulse(speed);
          }, 0);
        }
      });
    });
  };
  this.stopPulse = function() {
    if (this.pulsing) {
      pulse = false;
      clearInterval(fadeInterval);
    }
  };
  this.close = () => new Promise((resolve, reject) => {
    logger.info('[LED %d] Releasing pin', pin);
    if (this.pulsing) {
      this.stopPulse();
    }
    writeToPiBlaster(util.format('%d=0', pin), function(err) {
      if (err) {
        resolve(util.format('[LED %d] Unable to turn of led, Error: ',
          pin, err));
        return;
      }
      writeToPiBlaster(util.format('release %d', pin), function(err) {
        if (err) {
          resolve(util.format('[LED %d] Unable to release pin, Error: ',
            pin, err));
          return;
        }
        logger.info('[LED %d] Pin %d released', pin, pin);
        resolve('success');
      });
    });
  });
  Settings.addCleanUpPromise(this.close);
}

// Exports
module.exports = Led;
