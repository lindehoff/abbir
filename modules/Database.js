/**
 * Module for Database connection
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
const logger = require('winston');
const Settings = require('./Settings');
const config = Settings.config;

logger.debug('[Database] Connecting to database with %s', config.database.connectionString);
const mongoose = require('mongoose');
mongoose.connect(config.database.connectionString);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
Settings.addCleanUpPromise(
  () => new Promise((resolve, reject) => {
    logger.info('[Database] Disconnecting from Database');
    mongoose.connection.close();
    resolve('success');
  })
);

module.exports = {
    mongoose: mongoose,
    db: db
};
