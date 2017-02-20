/**
 * Module for Buttons
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
const EventEmitter = require('events').EventEmitter;
const GpioButton = require('gpio-button');
const util = require('util');
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
  logger, gpioPin,
  nc = true,
  dubblePressTimeoutTime = 300,
  longPressTime = 1200,
  resetPressTime = 3000) {
  EventEmitter.call(this);
  const self = this;
  logger.info('[Button %d] Initializing button ', gpioPin);
  const button = new GpioButton('button' + gpioPin);
  this._pressed = button.pressed;
  this._released = button.released;
  this._held;
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
  let buttonEmit = (buttonEvent) => {
    logger.info('[Button %d] Button event "%s"',
      gpioPin,
      ButtonEvents.properties[buttonEvent].name
    );
    self.emit(buttonEvent);
  };
  button.on((nc) ? 'press' : 'release', function() {
    pressInterval = setInterval(function() {
      if (!self._held && pressedTime > dubblePressTimeoutTime) {
        buttonEmit(ButtonEvents.HELD_PRESS);
        self._held = true;
      }
      pressedTime += pressIntervalTime;
      if (pressedTime > longPressTime && !longPress) {
        buttonEmit(1);
        longPress = true;
      } else if (pressedTime > resetPressTime) {
        buttonEmit(2);
        resetPress = true;
        clearInterval(pressInterval);
        pressInterval = null;
      }
    }, pressIntervalTime);
  });
  button.on((nc) ? 'release' : 'press', function() {
    self._held = false;
    let lastRelease = new Date() - lastedRelease;
    if (lastRelease < dubblePressTimeoutTime &&
      !(longPress || resetPress)) {
      buttonEmit(3);
      clearTimeout(singlePressTimeout);
    } else if (lastRelease >= dubblePressTimeoutTime  &&
       !(longPress || resetPress)) {
      singlePressTimeout = setTimeout(function() {
        buttonEmit(4);
      }, dubblePressTimeoutTime);
    }
    clearInterval(pressInterval);
    longPress = false;
    resetPress = false;
    pressInterval = null;
    pressedTime = 0;
    lastedRelease = new Date();
  });

  button.on('ready', function() {
    buttonEmit(0);
  });
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
