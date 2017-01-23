'use strict';

const winston = require('winston');
const EmailClient = require('./modules/EmailClient');
const ProcessIncomming = require('./modules/ProcessIncomming');
const FBIController = require('./modules/FBIController');
const config = require('./config');

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

let exit = function() {
  emailClient.stop();
  processIncomming.stop();
};

const emailClient = new EmailClient(config, logger);
const processIncomming = new ProcessIncomming(config, logger);
let fbiController;

emailClient.start();
emailClient.on('newFiles', function(path) {
  processIncomming.processDir(path);
});

processIncomming.on('newImages', function(newImages) {
  fbiController = new FBIController(config, logger, newImages);
  console.log(fbiController.images);
});

process.on('SIGINT', exit);
