'use strict';

const winston = require('winston');
const EmailClient = require('./modules/EmailClient');
const ProcessIncomming = require('./modules/ProcessIncomming');
const FBIController = require('./modules/FBIController');
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

const exit = function() {
  emailClient.stop();
  processIncomming.stop();
  fbiController.stop();
};

const emailClient = new EmailClient(config, logger);
const processIncomming = new ProcessIncomming(config, logger);
let images = find(config.abbir.imagePath).filter(function(file) { return file.match(/\.jpg$/); });
const fbiController = new FBIController(config, logger, images);
fbiController.start();
emailClient.start();
emailClient.on('newFiles', function(path) {
  processIncomming.processDir(path);
});

processIncomming.on('newImages', function(newImages) {
  fbiController.showNewImages(newImages);
});

process.on('SIGINT', exit);
