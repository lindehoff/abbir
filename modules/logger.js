const logger = require('winston');
const config = require('../config');
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
  level: config.winston.consoleLogLevel
});
logger.add(logger.transports.File, {
  filename: config.winston.logfilePath,
  level: config.winston.fileLogLevel
});

module.exports = logger;
