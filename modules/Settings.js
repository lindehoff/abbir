/**
 * Module for Settings
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */
'use strict';
const fs = require('fs');
const logger = require('winston');
const configPath = __dirname + '/../config.json';
let Settings = (function() {
  let config;
  return {
    config: function() {
      if (!config) {
        logger.debug('[Settings] Loading config file from %s', configPath);
        config = require(configPath);
      }
      return config;
    }(),
    save: function() {
      logger.debug('[Settings] Saving config to %s', configPath);
      fs.writeFile(configPath,
        JSON.stringify(config, null, 2) , 'utf-8', (err) => {
          if (err) {
            logger.debug('[Settings] Error saving config to file %s, error: ',
              configPath,
              err);
          }
        });
    }
  };
})();

module.exports = Settings;
