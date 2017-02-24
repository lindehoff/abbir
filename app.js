'use strict';

const winston = require('winston');
const EmailClient = require('./modules/EmailClient');
const ProcessIncomming = require('./modules/ProcessIncomming');
const FBIController = require('./modules/FBIController');
const IrRemote = require('./modules/IrRemote');
const Button = require('./modules/Button');
const Led = require('./modules/Led');
const config = require('./config');
require('shelljs/global');

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
    level: config.winston.consoleLogLevel
  }),
    new (winston.transports.File)({
      filename: config.winston.logfilePath,
      level: config.winston.fileLogLevel
    })
  ]
});

let images = find(config.abbir.imagePath).filter(function(file) { return file.match(/\.jpg$/); });

const fbiController = new FBIController(config,
  logger, images, 10000);
fbiController.start();

const emailClient = new EmailClient(config, logger);
emailClient.start();
emailClient.on('newFiles', function(path) {
  processIncomming.processDir(path);
});

const processIncomming = new ProcessIncomming(config, logger);
processIncomming.on('newImages', function(newImages) {
  fbiController.showNewImages(newImages);
});
const irRemote = new IrRemote(config, logger);
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
    fbiController.toggleSlideShow();
  }else {
    fbiController.sendKey(button);
  }
});

const led = new Led(logger, 14);
led.startPulse(5000);

const button = new Button(config, logger, 4);
button.on(button.ButtonEvents.READY, function() {
  console.log('Ready');
});
button.on(button.ButtonEvents.SINGLE_RELEASE, function() {
  console.log('Press');
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
