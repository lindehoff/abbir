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

let sendKeyToTerminal = function (key, cb) {
  var setup_options = {
    EV_KEY : [ key ]
  }

  uinput.setup(setup_options, function(err, stream) {
    if (err) {
      throw(err);
    }

    var create_options = {
      name: 'myuinput',
      id: {
        bustype: uinput.BUS_VIRTUAL,
        vendor: 0x1,
        product: 0x1,
        version: 1
      }
    };

    uinput.create(stream, create_options, function (err) {
      if (err) {
        throw(err);
      }

      uinput.key_event(stream, key, function (err) {
        if (err) {
          throw(err);
        }
        if(cb) {
          cb();
        }
      });
    });
  });

}
let slideShow = false;
let resetSlideShowTimer = function (controller) {
  if(slideShow){
    clearInterval(slideShow);
    slideShow = null;
    slideShow = setInterval(function () {
      controller.nextImage();
    }, controller.slideShowInterval);
  }
}
let currentImage = 0;
let logger;
let config;
let numberString = '';
function FBIController(Config, Logger, images, slideShowInterval = 60000) {
  logger = Logger;
  config = Config;
  EventEmitter.call(this);
  let _images;
  let _slideShowInterval = slideShowInterval;
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
        throw new TypeError('The value must be an array.');
      }
      const array = [];
      for (let item of value) {
        if (!(fs.existsSync(item))) {
          throw new TypeError('File must exit');
        }
        array.push(item);
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
  this.images = images;
}

FBIController.prototype.start = function(images) {
  let fbiCommand = util.format('sudo fbi --device %s -T %d -blend %d %s \'%s\'', config.fbi.device, config.fbi.virtualConsole, config.fbi.blend, config.fbi.extra, (images || this.images).join("' '"));
  logger.info('Starting fbi with: %s %s', fbiCommand);
  exec(fbiCommand);
  this.toggleSlideShow(this.slideShowInterval, false);
}

FBIController.prototype.stop = function() {
  exec('sudo killall -9 fbi');
}

FBIController.prototype.showNewImages = function(images) {
  this.stop();
  this.start(images);
}

FBIController.prototype.toggleSlideShow = function(interval=this.slideShowInterval, runDirect=true) {
  let that = this;
  if(slideShow && interval === this.slideShowInterval) {
    logger.info('Slideshow is off');
    clearInterval(slideShow);
    slideShow = null;
    return;
  } else {
    if(interval === this.slideShowInterval){
      logger.info('Slideshow interval change');
      clearInterval(slideShow);
      slideShow = null;
    }
    slideShow = setInterval(function () {
      that.nextImage();
    }, interval);
    logger.info('Slideshow is on');
  }
  if(runDirect) {
    this.nextImage();
  }
}

FBIController.prototype.toggleInfo = function() {
  sendKeyToTerminal(uinput.KEY_I);
  logger.info('Current image %s index %d', this.images[currentImage], currentImage);
}

FBIController.prototype.toggleVerbose = function() {
  sendKeyToTerminal(uinput.KEY_V);
}

FBIController.prototype.nextImage = function() {
  let that = this;
  sendKeyToTerminal(uinput.KEY_J, function () {
    resetSlideShowTimer(that);
    numberString = '';
    if(that.images.length - 1 === currentImage){
      currentImage = 0;
    } else {
      ++currentImage;
    }
  });
}

FBIController.prototype.prevImage = function() {
  let that = this;
  numberString = '';
  sendKeyToTerminal(uinput.KEY_K, function () {
    resetSlideShowTimer(that);
    if(currentImage === 0){
      currentImage = that.images.length-1;
    } else {
      --currentImage;
    }
  });
}

FBIController.prototype.zoomIn = function() {
  numberString = '';
  sendKeyToTerminal(uinput.KEY_KPPLUS);
}

FBIController.prototype.zoomOut = function() {
  numberString = '';
  sendKeyToTerminal(uinput.KEY_KPMINUS);
}

FBIController.prototype.sendKey = function(button) {
  let that = this;
  if(button === 'BTN_ENTER'){
    sendKeyToTerminal(uinput.KEY_G, function () {
      let number = parseInt(numberString, 10)
      if (!isNaN(number) && number <= that.images.length && number > 0) {
        currentImage = number - 1;
      }
      numberString = '';
    });
  } else {
    let num = parseInt(button.replace('BTN_', ''), 10);
    console.log(num)
    if(!isNaN(num)){
      numberString = util.format('%s%s', numberString, num)
    }
    sendKeyToTerminal(uinput[button.replace('BTN', 'KEY')]);
  }
}

util.inherits(FBIController, EventEmitter);
// Exports
module.exports = FBIController;
