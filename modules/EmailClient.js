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
const util = require('util');
const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;
const logger = require('winston');
const Settings = require('./Settings');
const config = Settings.config;

let closing = false;

function EmailClient() {
  EventEmitter.call(this);
  const self = this;
  let mailListener = new MailListener(config.mailListener);
  let reconnectTimeout;
  let reConnect = function(sleep) {
    if (!closing && (sleep || !reconnectTimeout)) {
      sleep = sleep || config.mailListener.connTimeout;
      logger.info('[%s] Trying to reconnect', config.abbir.screenName);
      mailListener = new MailListener(config.mailListener);
      setTimeout(() => self.start(), 500);
      reconnectTimeout = setTimeout(() => {
        if (sleep < (1000 * 60 * 60)) {
          sleep = sleep * 2;
        }
        if (reconnectTimeout) {
          logger.debug('[%s] Will try to reconnect in %d sec.', config.abbir.screenName, sleep / 1000)
          reConnect(sleep);
        }
      }, sleep);
    }
  };

  this.start = function() {
    mailListener.on('server:connected', function() {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      logger.info('[%s] imapConnected', config.abbir.screenName);
    });

    mailListener.on('server:disconnected', function() {
      if (!reconnectTimeout) {
        logger.warn('[%s] imapDisconnected:', config.abbir.screenName);
        reConnect();
      }
    });

    mailListener.on('error', function(err) {
      logger.debug('[%s] imap error: ', config.abbir.screenName, err);
      if (!reconnectTimeout) {
        logger.error('[%s] imap error: ', config.abbir.screenName, err);
        reConnect();
      }
    });

    mailListener.on('mail', function(mail, seqno, attributes) {
      logger.info('[%s] Email Recived: %j, attributes: ',
        config.abbir.screenName,
        mail.messageId,
        attributes);
      let user = config.abbir.acceptedUsers.find(x => x.emailAddress.includes(mail.from[0].address));
      if (user) {
        logger.info('[%s] Email address in acceptedEmailAddress: %s',
          config.abbir.screenName,
          mail.from[0].address);
        if (mail.hasOwnProperty('attachments')) {
          let path = config.abbir.incommingPath + '/images/' + user.name + '/';
          let title = util.format('%s from %s', mail.date.toLocaleDateString('sv-SE'), user.name);
          if (mail.subject) {
            title = mail.subject;
          } else {
            let lines = mail.text.split('\n');
            if(lines.length > 0 && /\S/.test(lines[0])) {
              title = lines[0].trim();
            }
          }
          path += title + '/';
          let info = {
            date: mail.date,
            from: mail.from[0].address,
            user: user.name,
            subject: mail.subject,
            messageId: mail.messageId,
            text: mail.text,
            title: title,
            attachments: []
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
                let infoAttachment = _.pick(attachment, ['checksum', 'contentId', 'contentType', 'generatedFileName']);
                info.attachments.push(infoAttachment);
                if (attachment.contentType === 'image/jpeg') {
                  ++imageCount;
                  logger.info('[%s] attachment found in %s: ',
                    config.abbir.screenName,
                    mail.messageId,
                    attachment.generatedFileName);
                  let filePath =  util.format('%s%s.jpg',
                    path,
                    attachment.generatedFileName);
                  fs.writeFile(filePath, attachment.content, function(err) {
                    if (err) {
                      logger.warn('[%s] Unable to save image %s, Error: ',
                        config.abbir.screenName,
                        attachment.generatedFileName,
                        err);
                      infoAttachment.status = err;
                      --imageCount;
                    }

                    infoAttachment.status = 'Saved: ' + filePath;
                    callback();

                  });
                } else {
                  logger.info('[%s] Attachment, %s, in email %s, is not an image/jpeg: %s',
                    config.abbir.screenName,
                    attachment.generatedFileName,
                    mail.messageId,
                    attachment.contentType);
                  callback();
                  infoAttachment.status = 'Not saved';
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
                if (imageCount > 0) {
                  fs.writeFile(path + '/info.json', JSON.stringify(info, null, 2) , 'utf-8');
                  self.emit('newFiles', path);
                } else {
                  //todo: remove path
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
    mailListener.start();
  };

  this.close = () => new Promise((resolve, reject) => {
    closing = true;
    mailListener.stop();
    resolve('success');
  });
  Settings.addCleanUpPromise(this.close);

}

util.inherits(EmailClient, EventEmitter);
// Exports
module.exports = EmailClient;
