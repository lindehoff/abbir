/**
 * Module for Buttons
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const Gpio = require('onoff').Gpio;
const ButtonEvents = {
  READY: 0,
  LONG_PRESS: 1,
  RESET_PRESS: 2,
  DOUBLE_RELEASE: 3,
  SINGLE_RELEASE: 4,
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
      name: 'dubbleRelease',
      value: 3,
      desc: 'Event when button pushed twiced'},
    4: {
      name: 'singleRelease',
      value: 4,
      desc: 'Event when button pushed onece'},
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
  logger.info('[Button %d] Initializing button ', gpioPin);
  const button = new Gpio(gpioPin, 'in', 'both');
  let pressed = false;
  let held = false;
  let pressInterval;
  let pressedTime = 0;
  const pressIntervalTime = 10;
  let lastedRelease = 0;
  let longPress = false;
  let resetPress = false;
  let singlePressTimeout;
  let readStream;
  let lastEvent = ButtonEvents.READY;
  Object.defineProperties(this, {
    'ButtonEvents': {
      'get': function() {
        return ButtonEvents;
      }
    }
  });
  Object.defineProperties(this, {
    'Pressed': {
      'get': function() {
        return pressed;
      }
    }
  });
  Object.defineProperties(this, {
    'Released': {
      'get': function() {
        return !pressed;
      }
    }
  });
  Object.defineProperties(this, {
    'Held': {
      'get': function() {
        return held;
      }
    }
  });
  Object.defineProperties(this, {
    'LastEvent': {
      'get': function() {
        return lastEvent;
      }
    }
  });
  let buttonEmit = (buttonEvent) => {
    logger.info('[Button %d] Button event "%s"',
      gpioPin,
      ButtonEvents.properties[buttonEvent].name
    );
    this.emit(buttonEvent);
    lastEvent = buttonEvent;
  };

  button.watch(function(err, value) {
    if (err) {
      logger.error('[Button %d] Error; ', gpioPin, err);
      return;
    }
    if (value === ((nc) ? 0 : 1) && !this.Released) {
      held = false;
      pressed = false;
      let lastRelease = new Date() - lastedRelease;
      if (lastRelease < dubblePressTimeoutTime &&
        !(longPress || resetPress)) {
        buttonEmit(ButtonEvents.DOUBLE_RELEASE);
        clearTimeout(singlePressTimeout);
      } else if (lastRelease >= dubblePressTimeoutTime  &&
         !(longPress || resetPress)) {
        singlePressTimeout = setTimeout(function() {
          buttonEmit(ButtonEvents.SINGLE_RELEASE);
        }, dubblePressTimeoutTime);
      }
      clearInterval(pressInterval);
      longPress = false;
      resetPress = false;
      pressInterval = null;
      pressedTime = 0;
      lastedRelease = new Date();
    } else if (value === ((nc) ? 1 : 0)  && !this.Pressed) {
      pressed = true;
      pressInterval = setInterval(function() {
        if (!held && pressedTime > dubblePressTimeoutTime) {
          buttonEmit(ButtonEvents.HELD_PRESS);
          held = true;
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
  }.bind(this));
  setTimeout(() => buttonEmit(ButtonEvents.READY), 0);
  this.close = () => new Promise((resolve, reject) => {
    logger.info('[Button %d] Releasing button ', gpioPin);
    button.unexport();
    resolve('success');
  });
}

util.inherits(Button, EventEmitter);
// Exports
module.exports = Button;
