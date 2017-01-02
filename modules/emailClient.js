/**
 * Module for email client
 *
 * @author Jacob Lindehoff
 * @version 0.1.0
 */

'use strict';
const MailListener = require('mail-listener2');

function EmailClient(config, logger) {
  let mailListener = new MailListener(config);
  mailListener.on('server:connected', function(){
    logger.info('[%s] imapConnected', customerConfig.customerInfo.name);
  });

  mailListener.on('server:disconnected', function(){
    logger.warn('[%s] imapDisconnected', customerConfig.customerInfo.name);
    this.start();
  });

  mailListener.on('error', function(err){
    logger.error('[%s] imap error: ', customerConfig.customerInfo.name, err);
    this.start();
  });
}

// Exports
module.exports = {
  EmailClient
};
