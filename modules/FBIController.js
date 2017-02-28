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
const logger = require('winston');
const config = require('./Settings').config;

let sendKeyToTerminal = function(key, cb) {
  var setupOptions = {
    EV_KEY: [key]
  };

  uinput.setup(setupOptions, function(err, stream) {
    if (err) {
      throw(err);
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

    uinput.create(stream, createOptions, function(err) {
      if (err) {
        throw(err);
      }

      uinput.key_event(stream, key, function(err) {
        if (err) {
          throw(err);
        }
        if (cb) {
          cb();
        }
      });
    });
  });
};

let slideShow = false;
let resetSlideShowTimer = function(controller) {
  if (slideShow) {
    clearInterval(slideShow);
    slideShow = null;
    slideShow = setInterval(function() {
      controller.nextImage();
    }, controller.slideShowInterval);
  }
};
let currentImage = 0;
let numberString = '';
function FBIController(images, slideShowInterval = 60000) {
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

  Object.defineProperty(this, 'slideShow', {
    enumerable: true,
    get: () => {
      return slideShow;
    }
  });
  this.images = images;
}

FBIController.prototype.start = function(images, cb) {
  let fbiCommand = util.format('sudo fbi --device %s -T %d -blend %d %s \'%s\'', config.fbi.device, config.fbi.virtualConsole, config.fbi.blend, config.fbi.extra, (images || this.images).join("' '"));
  logger.info('Starting fbi');
  exec(fbiCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      if (cb) {
        cb(error);
      }
      return;
    }
    if (cb) {
      cb();
    }
  });
  this.toggleSlideShow(this.slideShowInterval, false);
};
FBIController.prototype.stop = () => {
  logger.warn('[%s] Stoping fbi controller',
    config.abbir.screenName);
  sendKeyToTerminal(uinput.KEY_Q);
};
FBIController.prototype.close = () => new Promise((resolve, reject) => {
  logger.warn('[%s] Closing fbi controller',
    config.abbir.screenName);
  sendKeyToTerminal(uinput.KEY_Q, function() {
    resolve('success');
    /*
    exec('sudo killall -9 fbi', (error, stdout, stderr) => {
      if (error) {
        resolve(`error: ${error}`);
        return;
      }
      resolve('success');
    });
    */
  });
});

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
  this.goToImage(50);
}

FBIController.prototype.sendKey = function(button) {
  let that = this;
  if(button === 'BTN_ENTER'){
    sendKeyToTerminal(uinput.KEY_G, function () {
      resetSlideShowTimer(that);
      let number = parseInt(numberString, 10)
      if (!isNaN(number) && number <= that.images.length && number > 0) {
        currentImage = number - 1;
      }
      numberString = '';
    });
  } else if(button === 'BTN_BACK') {
    this.goToImage(Math.floor(Math.random() * this.images.length) + 1  )
  }else {
    resetSlideShowTimer(that);
    let num = parseInt(button.replace('BTN_KP', ''), 10);
    if(!isNaN(num)){
      numberString = util.format('%s%s', numberString, num)
    }
    sendKeyToTerminal(uinput[button.replace('BTN_KP', 'KEY_')]);
  }
}

FBIController.prototype.goToImage = function(index) {
  let keys = [];
  let that = this;
  resetSlideShowTimer(that);
  for (let i = 0; i < index.toString().length; i++){
    setTimeout(function () {
      sendKeyToTerminal(uinput['KEY_' + index.toString()[i]]);
    }, i*100);
  }
  setTimeout(function () {
    sendKeyToTerminal(uinput.KEY_G, function () {
      currentImage = index - 1;
      resetSlideShowTimer(that);
    });
  }, index.toString().length * 100);

}
util.inherits(FBIController, EventEmitter);
// Exports
module.exports = FBIController;
