/**
 * Module for processing incomming files
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
const fs = require('fs');
const mkdirp = require('mkdirp');
const async = require('async');
const exec = require('child_process').exec;
const AWS = require('aws-sdk');
const gm = require('gm');
const moment = require('moment-timezone');
const util = require('util');
const pathUtil = require('path');
const EventEmitter = require('events').EventEmitter;

function ProcessIncomming(config, logger) {
  EventEmitter.call(this);
  const self = this;
  AWS.config.update(config.amazon.s3Options);
  const s3 = new AWS.S3({
    params: {Bucket: config.amazon.imageBucket}
  });

  this.stop = function() {
    logger.warn('[%s] Stoped processing incomming files',
      config.abbir.screenName);
  };

  this.processDir = function(path) {
    fs.readdir(path, function(err, files) {
      if (err) {
        logger.error('[%s] Could not list the directory %s, error: ',
          config.abbir.screenName,
          path,
          err);
        return;
      }
      let albumInfo = files.find(fileName => fileName === 'info.json');
      if (albumInfo) {
        albumInfo = JSON.parse(fs.readFileSync(path + albumInfo, 'utf8'));
      }
      let newImages = [];
      async.each(files, function(file, callback) {
        let filePath = path + file;
        if (pathUtil.extname(file).toLowerCase() === '.jpg') {
          fs.readFile(filePath, function(err, data) {
            getImageDate(data, function(err, date) {
              if (!err) {
                let newPath = util.format('%s%s/%s/%s/%s/',
                  config.abbir.imagePath,
                  albumInfo.user,
                  date.format('YYYY'),
                  date.format('MM'),
                  albumInfo.title);
                let newFileName = util.format('%s [%s] %s.jpg',
                  date.format('YYYY-MM-DDThh.mm.ss'),
                  albumInfo.user,
                  albumInfo.title);
                backup(data, newPath + newFileName, config.amazon.backup,
                  function(err) {
                  if (err) {
                    console.log('There was an error uploading your photo: ',
                      err.message);
                    callback();
                    return;
                  }
                  mkdirp(newPath, function(err) {
                    if (err) {
                      logger.warn('[%s] Unable to create path %s, Error: ',
                        config.abbir.screenName,
                        newPath,
                        err);
                    } else {
                      let newFilePath = newPath + newFileName;
                      gm(data)
                      .comment(util.format('%s. Sent from %s (%s) ',
                        albumInfo.title,
                        albumInfo.user,
                        albumInfo.from))
                      .resize(config.abbir.imageSize, config.abbir.imageSize)
                      .write(newFilePath, function(err) {
                        if (err) {
                          logger.warn('[%s] Unable to save/resize image %s from email [%s], Error: ',
                            config.abbir.screenName,
                            newFileName,
                            albumInfo.messageId,
                            err);
                        } else {
                          logger.info('[%s] Image %s saved and resized from email [%s]',
                            config.abbir.screenName,
                            newFileName,
                            albumInfo.messageId);
                          exec('exiftran -ai \'' + newFilePath + '\'', function() {
                            logger.info('[%s] Updating timestamp in image %s to %s',
                              config.abbir.screenName,
                              newFilePath,
                              date);
                            fs.utimes(newFilePath, new Date(date) / 1000, new Date(albumInfo.date) / 1000, function (err) {
                              if (err) {
                                logger.warn('[%s] Unable to update timestamp in image %s to %s, Error: ',
                                  config.abbir.screenName,
                                  newFilePath,
                                  date,
                                  err);
                              } else {
                                logger.info('[%s] Image %s date changed]',
                                  config.abbir.screenName,
                                  newFilePath);
                              }
                              fs.unlinkSync(filePath);
                              newImages.push(newFilePath);
                              callback();
                            });
                          });
                        }
                      });
                    }
                  });

                });
              } else {
                fs.unlinkSync(filePath);
                callback();
              }
            });
          });
        } else {
          fs.unlinkSync(filePath);
          callback();
        }
      }, function(err) {
        if (err) {
          logger.error('[%s] Unable to process some files in directory %s, error: ',
            config.abbir.screenName,
            path,
            err);
        } else {
          fs.rmdir(path, function(err) {
            if (err) {
              logger.warn('[%s] Unable to delete directory %s, error: ',
                config.abbir.screenName,
                path,
                err);
            } else {
              logger.info('[%s] Deleted directory %s',
                config.abbir.screenName,
                path);
            }
          });
        }
        self.emit('newImages', newImages);
      });
    });
  };

  let backup = function(fileBuffer, path, enabled, callback) {
    if (enabled) {
      s3.upload({
        Key: path,
        Body: fileBuffer
      }, callback);
    } else {
      callback();
    }
  };

  let getImageDate = function(file, callback) {
    let date;
    try {
      gm(file)
      .identify(function(err, data) {
        if (err) {
          logger.warn('[%s] Unable to read metadata from image %s, Error: ', config.abbir.screenName, file.name, err);
          callback(err);
          return;
        } else {
          if (data.hasOwnProperty('Profile-EXIF') && (data['Profile-EXIF'].hasOwnProperty('Date Time Original') || data['Profile-EXIF'].hasOwnProperty('Date Time'))) {
            date = data['Profile-EXIF']['Date Time Original'] || data['Profile-EXIF']['Date Time'];
            let tmp = date.split(' ');
            tmp[0] = tmp[0].split(':').join('-');
            date = moment.tz(tmp[0] + 'T' + tmp[1], 'Europe/Stockholm');
            callback(null, date);
          } else {
            callback(new Error('No EXIF info found'));
            return;
          }
        }
      });
    } catch (err) {
      callback(err);
      return;
    }
  };
}

util.inherits(ProcessIncomming, EventEmitter);
// Exports
module.exports = ProcessIncomming;
