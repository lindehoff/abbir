/**
 * Module for Buttons
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const fs = require('fs');
const glob = require('glob');

const EVENT_FILE_PREFIX = '/dev/input/by-path/platform-*';
const EVENT_FILE_SUFFIX = '*-event';
const EVENT_DATA_SIZE = 32;
const EVENT_TYPE_INDEX = 12;

const ButtonEvents = {
  READY: 0,
  LONG_PRESS: 1,
  RESET_PRESS: 2,
  DOUBLE_PRESS: 3,
  PRESS: 4,
  HELD_PRESS: 5,
  properties: {
    0: {
      name: 'ready',
      value: 0,
      desc: 'Event when button Ready'},
    1: {
      name: 'longPress',
      value: 1,
      desc: 'Event when button pressed for a long time'},
    2: {
      name: 'resetPress',
      value: 2,
      desc: 'Event when button pressed for a realy long time'},
    3: {
      name: 'dubblePress',
      value: 3,
      desc: 'Event when button pressed twiced'},
    4: {
      name: 'press',
      value: 4,
      desc: 'Event when button pressed'},
    5: {
      name: 'held',
      value: 5,
      desc: 'Event when button is held down'},
  }
};

function Button(config,
  logger,
  gpioPin,
  nc = true,
  dubblePressTimeoutTime = 300,
  longPressTime = 1200,
  resetPressTime = 3000) {
  EventEmitter.call(this);
  const self = this;
  logger.info('[Button %d] Initializing button ', gpioPin);
  var eventFilePattern;

  if (!(this instanceof Button)) {
    return new Button(config,
      logger,
      gpioPin,
      nc,
      dubblePressTimeoutTime,
      longPressTime,
      resetPressTime
    );
  }

  this._pressed = false;
  this._held = false;
  Object.defineProperties(this, {
    'ButtonEvents': {
      'get': function() {
        return ButtonEvents;
      }
    }
  });
  let pressInterval;
  let pressedTime = 0;
  let pressIntervalTime = 10;
  let lastedRelease = 0;
  let longPress = false;
  let resetPress = false;
  let singlePressTimeout;
  let readStream;
  let buttonEmit = (buttonEvent) => {
    logger.info('[Button %d] Button event "%s"',
      gpioPin,
      ButtonEvents.properties[buttonEvent].name
    );
    self.emit(buttonEvent);
  };
  eventFilePattern = EVENT_FILE_PREFIX + 'button' + gpioPin + EVENT_FILE_SUFFIX;
  glob(eventFilePattern, null, function(err, matches) {
    var data = new Buffer(0);

    if (err) {
      return self.emit('error', err);
    }

    if (matches.length === 0) {
      return self.emit('error',
        new Error('Event file \'' + eventFilePattern + '\' not found'));
    }

    if (matches.length > 1) {
      return self.emit('error',
        new Error('Multiple event files \'' + eventFilePattern + '\' found'));
    }

    readStream = fs.createReadStream(matches[0]);
    readStream.on('close', error => console.log('Stream closed'));
    readStream.on('data', function(buf) {
      data = Buffer.concat([data, buf]);
      while (data.length >= EVENT_DATA_SIZE) {
        if (data[EVENT_TYPE_INDEX] === (nc) ? 0 : 1) {
          self._held = false;
          let lastRelease = new Date() - lastedRelease;
          if (lastRelease < dubblePressTimeoutTime &&
            !(longPress || resetPress)) {
            buttonEmit(ButtonEvents.DOUBLE_PRESS);
            clearTimeout(singlePressTimeout);
          } else if (lastRelease >= dubblePressTimeoutTime  &&
             !(longPress || resetPress)) {
            singlePressTimeout = setTimeout(function() {
              buttonEmit(ButtonEvents.PRESS);
            }, dubblePressTimeoutTime);
          }
          clearInterval(pressInterval);
          longPress = false;
          resetPress = false;
          pressInterval = null;
          pressedTime = 0;
          lastedRelease = new Date();
        } else if (data[EVENT_TYPE_INDEX] === (nc) ? 1 : 0) {
          pressInterval = setInterval(function() {
            if (!self._held && pressedTime > dubblePressTimeoutTime) {
              buttonEmit(ButtonEvents.HELD_PRESS);
              self._held = true;
            }
            pressedTime += pressIntervalTime;
            if (pressedTime > longPressTime && !longPress) {
              buttonEmit(ButtonEvents.LONG_PRESS);
              longPress = true;
            } else if (pressedTime > resetPressTime) {
              buttonEmit(ButtonEvents.RESET_PRESS);
              resetPress = true;
              clearInterval(pressInterval);
              pressInterval = null;
            }
          }, pressIntervalTime);
        }
        /* else if (data[EVENT_TYPE_INDEX] === 2) {
          self._held = true;
          self.emit('hold');
        }*/

        data = data.slice(EVENT_DATA_SIZE);
      }

    });
    buttonEmit(ButtonEvents.READY);
  });
  this.close = function() {
    //TODO: fix this it does not work
    readStream.destroy();
  };
}

Button.prototype.pressed = function() {
  return this._pressed;
};

Button.prototype.held = function() {
  return this._held;
};

Button.prototype.released = function() {
  return !this.pressed();
};

util.inherits(Button, EventEmitter);
// Exports
module.exports = Button;
