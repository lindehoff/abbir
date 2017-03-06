'use strict';
const EmailClient = require('./modules/EmailClient');
const ProcessIncomming = require('./modules/ProcessIncomming');
const FBIController = require('./modules/FBIController');
const IrRemote = require('./modules/IrRemote');
const Button = require('./modules/Button');
const Led = require('./modules/Led');
const Settings = require('./modules/Settings');
const logger = require('./modules/logger.js');
require('shelljs/global');

let config = Settings.config;
let images = find(config.abbir.imagePath).filter(function(file) { return file.match(/\.jpg$/); });

const fbiController = new FBIController(images, 10000);
fbiController.start();
let running = true;
const emailClient = new EmailClient();
emailClient.start();
emailClient.on('newFiles', function(path) {
  processIncomming.processDir(path);
});

const processIncomming = new ProcessIncomming();
processIncomming.on('newImages', function(newImages) {
  fbiController.showNewImages(newImages);
});
const irRemote = new IrRemote();
irRemote.on('buttonPress', function(button) {
  logger.info('Button %s pressed', button);

  if (button === 'BTN_RIGHT') {
    fbiController.nextImage();
  }else if (button === 'BTN_LEFT') {
    fbiController.prevImage();
  }else if (button === 'BTN_UP') {
    fbiController.zoomIn();
  }else if (button === 'BTN_DOWN') {
    fbiController.zoomOut();
  }else if (button === 'BTN_SETUP') {
    fbiController.toggleVerbose();
  }else if (button === 'BTN_STOP') {
    fbiController.toggleInfo();
  }else if (button === 'BTN_PLAYPAUSE') {
    if (fbiController.slideShow) {
      fbiController.stopSlideShow();
    } else {
      fbiController.startSlideShow();
    }
  } else if (button === 'BTN_VOLUMEUP') {
    logger.info('FBI running: %s', fbiController.running);
  }else {
    fbiController.sendKey(button);
  }
});

const led = new Led(config.abbir.hardware.ledPin);
led.turnOn();

const button = new Button(config.abbir.hardware.buttonPin);
button.on(button.ButtonEvents.READY, function() {
  console.log('Ready');
});
button.on(button.ButtonEvents.SINGLE_RELEASE, function() {
  console.log('Running: %s', running);
  if (running) {
    fbiController.stop();
    led.turnOff();
    exec('/opt/vc/bin/tvservice --off');
    running = false;
  } else {
    running = true;
    led.turnOn();
    exec('/opt/vc/bin/tvservice --preferred;fbset -depth 8; fbset -depth 16');
    fbiController.start(null, (err) => {
      if (!fbiController.slideShow) {
        fbiController.toggleSlideShow();
      }
    });
  }
});

const exit = new Array(
  led.close,
  button.close,
  irRemote.close,
  emailClient.close,
  processIncomming.close,
  fbiController.close);

const cleanup = require('./modules/cleanup').Cleanup(exit);
process.stdin.resume();
