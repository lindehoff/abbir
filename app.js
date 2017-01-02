'use strict';

const winston = require('winston');
const EmailClient = require('./modules/EmailClient');
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
};

const emailClient = new EmailClient(config, logger);
emailClient.start();

process.on('SIGINT', exit);
