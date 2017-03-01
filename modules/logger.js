const logger = require('winston');
const config = require('./Settings').config;
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, config.winston.consoleOptions);
logger.add(logger.transports.File, config.winston.fileOptions);

module.exports = logger;
