/**
 * Module for Cleanup on app shutdown
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
exports.Cleanup = function Cleanup(cleanUpCloses) {
  let cleanUpDone = false;
  process.on('cleanup', () => {
    if (!cleanUpDone) {
      if (Array.isArray(cleanUpCloses)) {
        let cleanUpPromises = cleanUpCloses.map(cleanUpClose => cleanUpClose());
        Promise.all(cleanUpPromises)
        .then(values => {
          let err = false;
          values.forEach(value => {
            if (value !== 'success') {
              console.log(value);
              err = true;
            }
          });
          process.exit((err) ? 1 : 0);
        });
      } else {
        process.exit(0);
      }
      cleanUpDone = true;
    }
  });

  // do app specific cleaning before exiting
  process.on('exit', function() {
    process.emit('cleanup');
  });

  // catch ctrl+c event and exit normally
  process.on('SIGINT', function() {
    console.log('trl-C...');
    process.emit('cleanup');
  });

  //catch uncaught exceptions, trace, then exit normally
  process.on('uncaughtException', function(e) {
    console.log('Uncaught Exception...');
    console.log(e.stack);
    process.exit(99);
  });
};
