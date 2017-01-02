/**
 * Module for email client
 *
 * @author Jacob Lindehoff
 * @version 0.1.0
 */

'use strict';
const MailListener = require('mail-listener2');

function EmailClient(config, logger) {
  const mailListener = new MailListener(config.mailListener);
  mailListener.on('server:connected', function() {
    logger.info('[%s] imapConnected', config.abbir.screenName);
  });

  mailListener.on('server:disconnected', function() {
    logger.warn('[%s] imapDisconnected', config.abbir.screenName);
  });

  mailListener.on('error', function(err) {
    logger.error('[%s] imap error: ', config.abbir.screenName, err);
    this.start();
  });

  mailListener.on('mail', function(mail, seqno, attributes) {
    logger.info('[%s] Email Recived: %j, attributes: ',
      config.abbir.screenName,
      mail.messageId,
      attributes);
  });

  this.start = function() {
    mailListener.start();
  };

  this.stop = function() {
    mailListener.stop();
  };

}

// Exports
module.exports = EmailClient;
