/**
 * Module for Cleanup on app shutdown
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';

const logger = require('winston');

exports.Cleanup = function Cleanup() {
  let cleanUpDone = false;
  process.on('cleanup', () => {
    if (!cleanUpDone) {
      let cleanUpPromises = require('./Settings').cleanUpPromises;
      if (Array.isArray(cleanUpPromises)) {
        logger.info('[Cleanup] Starting');
        cleanUpPromises = cleanUpPromises.map(
          cleanUpPromise => cleanUpPromise()
        );
        Promise.all(cleanUpPromises)
        .then(values => {
          let err = false;
          values.forEach(value => {
            if (value !== 'success') {
              logger.error('[Cleanup] Error: %s', value);
              err = true;
            }
          });
          logger.info('[Cleanup] Done');
          process.exit((err) ? 1 : 0);
        });
      } else {
        logger.warn('[Cleanup] No array of cleanup promises, exit!');
        process.exit(0);
      }
      cleanUpDone = true;
    }
  });

  // do app specific cleaning before exiting
  process.on('exit', function() {
    logger.info('[Cleanup] Exit');
    process.emit('cleanup');
  });

  // catch ctrl+c event and exit normally
  process.on('SIGINT', function() {
    logger.info('[Cleanup] Ctrl-C...');
    process.emit('cleanup');
  });

  //catch uncaught exceptions, trace, then exit normally
  process.on('uncaughtException', function(e) {
    logger.error('[Cleanup] Uncaught Exception: %s', e.stack);
    process.exit(99);
  });
};
