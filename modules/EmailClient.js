/**
 * Module for email client
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
const MailListener = require('mail-listener2');
const fs = require('fs');
const mkdirp = require('mkdirp');
const async = require('async');

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
    if (config.abbir.acceptedUsers.some(x => x.emailAddress.includes(mail.from[0].address))) {
      logger.info('[%s] Email address in acceptedEmailAddress: %s',
        config.abbir.screenName,
        mail.from[0].address);
      if (mail.hasOwnProperty('attachments')) {
        let path = config.abbir.incommingPath + '/' + mail.messageId;
        if (mail.subject) {
          path += '/' + mail.subject;
        }
        let imageCount = 0;
        mkdirp(path, function(err) {
          if (err) {
            logger.warn('[%s] Unable to create path %s, Error: ',
              config.abbir.screenName,
              path,
              err);
          } else {
            async.each(mail.attachments, function(attachment, callback) {
              if (attachment.contentType === 'image/jpeg') {
                logger.info('[%s] attachment found in %s: ',
                  config.abbir.screenName,
                  mail.messageId,
                  attachment.generatedFileName);
                fs.writeFile(path + '/' + attachment.generatedFileName, attachment.content, function(err) {
                  if (err) {
                    logger.warn('[%s] Unable to save image %s, Error: ',
                      config.abbir.screenName,
                      attachment.generatedFileName,
                      err);
                  } else {
                    ++imageCount;
                  }
                  callback();

                });
              } else {
                logger.info('[%s] Attachment, %s, in email %s, is not an image/jpeg: %s',
                  config.abbir.screenName,
                  attachment.generatedFileName,
                  mail.messageId,
                  attachment.contentType);
                callback();
              }
            }, function(err) {
              if (err) {
                logger.warn('[%s] Unable to save some images from mail %s, Error: ',
                  config.abbir.screenName,
                  mail.messageId,
                  err);
              } else {
                logger.info('[%s] %d of %d attachment saved to incomming from mail %s: ',
                  config.abbir.screenName,
                  imageCount,
                  mail.attachments.length,
                  mail.messageId);
              }
            });
          }
        });
      } else {
        logger.warn('[%s] Email [%s] has no attachments',
          config.abbir.screenName,
          mail.messageId);
      }
    } else {
      logger.info('[%s] Email address not in acceptedEmailAddress: %s',
        config.abbir.screenName,
        mail.from[0].address);
    }
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
