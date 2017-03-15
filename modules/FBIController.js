/**
* Module for controlling FBI
*
* @author Jacob Lindehoff
* @version 1.0.0
*/

'use strict';
const EventEmitter = require('events').EventEmitter;
const fs = require('fs');
const util = require('util');
const uinput = require('uinput');
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const logger = require('winston');
const Settings = require('./Settings');
const config = Settings.config;

let _slideShow = false;
let _currentImage = 0;
let _numberString = '';
let _keepAliveInterval;
let _keepAlive = false;
let sendKeyToTerminal = function(key, cb) {
  var setupOptions = {
    EV_KEY: Array.isArray(key) ? key : [key]
  };

  uinput.setup(setupOptions, function(err, stream) {
    if (err) {
      cb(err);
      return;
    }

    var createOptions = {
      name: 'myuinput',
      id: {
        bustype: uinput.BUS_VIRTUAL,
        vendor: 0x1,
        product: 0x1,
        version: 1
      }
    };

    let done = function(err) {
      if (err) {
        cb(err);
        return;
      }
      if (cb) {
        cb();
      }
    };
    uinput.create(stream, createOptions, function(err) {
      if (err) {
        cb(err);
        return;
      }
      if (Array.isArray(key)) {
        uinput.emit_combo(stream, setupOptions.EV_KEY, done);
      } else {
        uinput.key_event(stream, key, done);
      }
    });
  });
};

let resetSlideShowTimer = function(controller) {
  if (_slideShow) {
    clearInterval(_slideShow);
    _slideShow = null;
    _slideShow = setInterval(function() {
      controller.nextImage();
    }, controller.slideShowInterval);
  }
};

function FBIController(images, slideShowInterval = 60000) {
  EventEmitter.call(this);
  let _images;
  let _slideShowInterval = slideShowInterval;
  let self = this;
  Object.defineProperty(this, 'images', {
    enumerable: true,
    get: () => {
      const copy = [];
      for (let item of _images) {
        copy.push(item);
      }
      return copy;
    },

    set: value => {
      if (!Array.isArray(value)) {
        logger.error('[FBI Controller] Images is not an array');
        return;
      }
      const array = [];
      for (let item of value) {
        if (!(fs.existsSync(item))) {
          logger.warn('[FBI Controller] File does not exits %s', item);
        } else {
          array.push(item);
        }
      }
      _images = array;
    }
  });
  Object.defineProperty(this, 'slideShowInterval', {
    enumerable: true,
    get: () => {
      return _slideShowInterval;
    },

    set: value => {
      //TODO: Check value
      this.toggleSlideShow(value);
      _slideShowInterval = value;
    }
  });

  Object.defineProperty(this, 'slideShow', {
    enumerable: true,
    get: () => {
      return (_slideShow) ? true : false;
    }
  });

  Object.defineProperty(this, 'running', {
    enumerable: true,
    get: () => {
      try {
        if (execSync('ps cax | grep fbi')) {
          return true;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    }
  });

  this.start = function(images, cb) {
    let fbiCommand = util.format('sudo fbi --device %s -T %d -blend %d %s \'%s\'',
      config.fbi.device,
      config.fbi.virtualConsole,
      config.fbi.blend,
      config.fbi.extra,
      (images || this.images).join('\' \'')
    );
    logger.debug('[FBI Controller] Starting fbi: %s', fbiCommand);
    exec(fbiCommand, (err, stdout, stderr) => {
      if (err) {
        logger.error('[FBI Controller] Error starting fbi, error: %s', err);
        if (cb) {
          cb(err);
        }
        return;
      }
      logger.debug('[FBI Controller] fbi started');
      if (cb) {
        cb();
      }
      if (_slideShow) {
        this.startSlideShow(false);
      }
      _keepAlive = true;
    });
  };
  this.stop = (cb) => {
    logger.debug('[FBI Controller] Stopping fbi');
    if (this.slideShow) {
      this.stopSlideShow();
    }
    let self = this;
    _keepAlive = false;
    sendKeyToTerminal(uinput.KEY_ESC, (err) => {
      setTimeout(() => {
        if (self.running) {
          logger.warn('[FBI Controller] Unable to quit fbi gracefuly, will force it to die');
          execSync('sudo killall -9 fbi');
          logger.debug('[FBI Controller] Returning to TTY1');
          let tty1 = [uinput.KEY_LEFTCTRL, uinput.KEY_LEFTALT, uinput.KEY_F1];
          sendKeyToTerminal(tty1, (err) => {
            if (err) {
              cb('Unable to go to TTY1');
            } else {
              logger.debug('[FBI Controller] Successfully returned to TTY1');
              cd();
            }
          });
        } else {
          cb();
        }
      }, 100);
    });
  };
  this.close = () => {
    let self = this;
    return new Promise((resolve, reject) => {
      logger.debug('[FBI Controller] Closing fbi controller');
      clearInterval(_keepAliveInterval);
      _keepAliveInterval = null;
      self.stop(function(err) {
        if (err) {
          resolve(util.format('[FBI Controller] Error: ', err));
          return;
        }
        logger.debug('[FBI Controller] fbi stoped');
        resolve('success');
      });
    });
  };
  Settings.addCleanUpPromise(this.close);

  this.stopSlideShow = function() {
    if (_slideShow) {
      logger.debug('[FBI Controller] Stoping slideshow');
      clearInterval(_slideShow);
      _slideShow = null;
    } else {
      logger.debug('[FBI Controller] Slideshow wasn\'t running');

    }
  };
  this.startSlideShow = function(runDirect=true) {
    let self = this;
    if (_slideShow) {
      self.stopSlideShow();
    }
    _slideShow = setInterval(function() {
      self.nextImage();
    }, self.slideShowInterval);
    logger.debug('[FBI Controller] Slideshow started');
    if (runDirect) {
      this.nextImage();
    }
  };

  this.toggleInfo = function() {
    sendKeyToTerminal(uinput.KEY_I, (err) => {
      if (err) {
        logger.error('[FBI Controller] Unable to toggle Info, error: %s', err);
      } else {
        logger.debug('[FBI Controller] Toggled Info');
      }
    });
  };

  this.toggleVerbose = function() {
    sendKeyToTerminal(uinput.KEY_V, (err) => {
      if (err) {
        logger.error('[FBI Controller] Unable to toggle Verbose, error: %s', err);
      } else {
        logger.debug('[FBI Controller] Toggled Verbose');
      }
    });
  };

  this.nextImage = function() {
    let self = this;
    sendKeyToTerminal(uinput.KEY_J, function(err) {
      if (err) {
        logger.error('[FBI Controller] Unable to go to next image, error: %s',
          err);
      } else {
        resetSlideShowTimer(self);
        _numberString = '';
        if (self.images.length - 1 === _currentImage) {
          _currentImage = 0;
        } else {
          ++_currentImage;
        }
        logger.debug('[FBI Controller] Next image, current image: [%d of %d] %s',
          _currentImage + 1,
          self.images.length,
          self.images[_currentImage]
        );
      }
    });
  };

  this.prevImage = function() {
    let self = this;
    _numberString = '';
    sendKeyToTerminal(uinput.KEY_K, function(err) {
      if (err) {
        logger.error('[FBI Controller] Unable to go to previous image, error: %s',
          err);
      } else {
        resetSlideShowTimer(self);
        if (_currentImage === 0) {
          _currentImage = self.images.length - 1;
        } else {
          --_currentImage;
        }
        logger.debug(
          '[FBI Controller] Previous image, current image: [%d of %d] %s',
          _currentImage + 1,
          self.images.length,
          self.images[_currentImage]
        );
      }
    });
  };

  this.zoomIn = function() {
    let self = this;
    _numberString = '';
    sendKeyToTerminal(uinput.KEY_KPPLUS, (err) => {
      if (err) {
        logger.error('[FBI Controller] Unable to zoom in, error: %s', err);
      } else {
        resetSlideShowTimer(self);
        logger.debug('[FBI Controller] Zoomed in');
      }
    });
  };

  this.zoomOut = function() {
    let self = this;
    _numberString = '';
    sendKeyToTerminal(uinput.KEY_KPMINUS, (err) => {
      if (err) {
        logger.error('[FBI Controller] Unable to zoom out, error: %s', err);
      } else {
        resetSlideShowTimer(self);
        logger.debug('[FBI Controller] Zoomed out');
      }
    });
  };

  this.sendKey = function(button) {
    let self = this;
    if (button === 'BTN_ENTER') {
      sendKeyToTerminal(uinput.KEY_G, function() {
        resetSlideShowTimer(self);
        let number = parseInt(_numberString, 10);
        if (!isNaN(number) && number <= self.images.length && number > 0) {
          _currentImage = number - 1;
        }
        _numberString = '';
      });
    } else if (button === 'BTN_BACK') {
      this.goToImage(Math.floor(Math.random() * this.images.length) + 1);
    }else {
      resetSlideShowTimer(self);
      let num = parseInt(button.replace('BTN_KP', ''), 10);
      if (!isNaN(num)) {
        _numberString = util.format('%s%s', _numberString, num);
      }
      sendKeyToTerminal(uinput[button.replace('BTN_KP', 'KEY_')]);
    }
  };

  this.goToImage = function(index) {
    let keys = [];
    let self = this;
    resetSlideShowTimer(self);

    logger.debug('[FBI Controller] Entering numbers for image %d', index);
    for (let i = 0; i < index.toString().length; i++) {
      setTimeout(function() {
        logger.debug('[FBI Controller] Entering number %s', index.toString()[i]);
        sendKeyToTerminal(uinput['KEY_' + index.toString()[i]]);
      }, i * 100);
    }
    setTimeout(function() {

      logger.debug('[FBI Controller] Entering G');
      sendKeyToTerminal(uinput.KEY_G, function() {
        _currentImage = index - 1;
        resetSlideShowTimer(self);
        logger.debug('[FBI Controller] GoTo image %d Done!', index);
      });
    }, index.toString().length * 100);

  };

  this.sync = function() {
    logger.debug('[FBI Controller] Syncing, goto image %d', _currentImage + 1);
    self.goToImage(_currentImage + 1);
  };

  this.images = images;
  _keepAliveInterval = setInterval(() => {
    if (_keepAlive && !self.running) {
      logger.warn('[FBI Controller] Fbi is not running, trying to restart');
      self.start(null, function(err) {
        setTimeout(self.sync, 500);
      });
    }
  }, 2000);
}

util.inherits(FBIController, EventEmitter);
// Exports
module.exports = FBIController;
