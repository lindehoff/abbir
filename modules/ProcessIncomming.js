/**
 * Module for processing incomming files
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
const fs = require('fs');
const mkdirp = require('mkdirp-promise');
const async = require('async');
const exec = require('child_process').exec;
const AWS = require('aws-sdk');
const gm = require('gm');
const moment = require('moment-timezone');
const util = require('util');
const pathUtil = require('path');
const EventEmitter = require('events').EventEmitter;
const logger = require('winston');
const crypto = require('crypto');
const Settings = require('./Settings');
const config = Settings.config;

const Resource = require('../models/Resource');
const ResourceType = require('../models/ResourceType');
const User = require('../models/User');
const Album = require('../models/Album');

function ProcessIncomming() {
  EventEmitter.call(this);
  const self = this;
  AWS.config.update(config.amazon.s3Options);
  const s3 = new AWS.S3({
    params: {Bucket: config.amazon.imageBucket}
  });

  this.close = () => new Promise((resolve, reject) => {
    logger.warn('[%s] Stoped processing incomming files',
      config.abbir.screenName);
    resolve('success');
  });
  Settings.addCleanUpPromise(this.close);

  this.processDir = function(path) {
    let processedData = {
      path: path,
      newResources: []
    };
    readdir(processedData.path)
    .then(files => {
      let albumInfoPath = files.find(fileName => fileName === 'info.json');
      if (albumInfoPath) {
        readJSON(path + albumInfoPath)
        .then(albumInfo => {
          processedData.albumInfo = albumInfo;
          return User.findOne({'email': albumInfo.from}).exec()
        })
        .then(owner =>  {
          processedData.owner = owner;
          processedData.album = new Album({name: processedData.albumInfo.title, owner: owner});
          return processedData.album.save();
        })
        .then(album => {
          processedData.album = album;
          return ResourceType.findOne({'name': 'image'}).exec()
        })
        .then(imageResourceType =>  {
          let resourceDetail = {
            name: null,
            created: null,
            fileName: null,
            owner: processedData.owner,
            resourceType: imageResourceType,
            album: processedData.album
          };
          async.each(files, function(file, callback) {
            let filePath = path + file;
            let fileData;
            let resource;
            if (pathUtil.extname(file).toLowerCase() === '.jpg') {
              readFile(filePath)
              .then(data => {
                fileData = data;
                console.log('Data: ', data.length);
                return getImageDate(fileData);
              })
              .then(date => {
                resourceDetail.created = date;
                resourceDetail.fileName = util.format('%s [%s] %s.jpg',
                  date.format('YYYY-MM-DDThh.mm.ss'),
                  processedData.album.owner.userName,
                  processedData.album.name
                );
                resourceDetail.name = resourceDetail.fileName;
                resource = new Resource(resourceDetail);
                return backup(fileData, resource.localPath);
              })
              .then(onlineUrl => {
                resource.onlineUrl = onlineUrl;
                return mkdirp(resource.localPath);
              })
              .then(() => {
                gm(fileData)
                .resize(config.abbir.imageSize, config.abbir.imageSize)
                .write(resource.localPath, function(err) {
                  if (err) {
                    logger.warn('[ProcessIncomming] Unable to save/resize image %s from email [%s], Error: ',
                      resource.fileName,
                      processedData.albumInfo.messageId,
                      err);
                  } else {
                    logger.info('[ProcessIncomming] Image %s saved and resized from email [%s]',
                      resource.fileName,
                      processedData.albumInfo.messageId);
                    exec('exiftran -ai \'' + resource.localPath + '\'', function() {
                      logger.info('[ProcessIncomming] Updating timestamp in image %s to %s',
                        resource.localPath,
                        date);
                      fs.utimes(resource.localPath, new Date(date) / 1000, new Date(processedData.albumInfo.date) / 1000, function(err) {
                        if (err) {
                          logger.warn('[ProcessIncomming] Unable to update timestamp in image %s to %s, Error: ',
                            resource.localPath,
                            date,
                            err);
                        } else {
                          logger.info('[ProcessIncomming] Image %s date changed]',
                            resource.localPath);
                        }
                        fs.unlinkSync(filePath);
                        resource.save()
                        .then(imageResource => {
                          processedData.newResources.push(imageResource);
                          callback();
                        })
                        .catch(err => {
                          logger.error('[ProcessIncomming] Unable to save resource %s to database, Error: ',
                            resource.localPath,
                            err);
                          callback(err);
                        });
                      });
                    });
                  }
                });
              })
              .catch(err => {
                logger.error('[ProcessIncomming] Unable to process file %s, error: ',
                  filePath,
                  err);
              });
            } else {
              logger.info('[ProcessIncomming] Not an jpg image',
                filePath);
            }
          });
        });
      } else {
        logger.warn('[ProcessIncomming] Unable to find info.json in %s',
          filePath);
      }
    })
    .then(() => {
      self.emit('newImages', processedData.newResources);
    })
    .catch(function(err) {
      logger.error('Error: %s', err);
    });
  };

  let backup = function(fileBuffer, path) {
    return new Promise(function(fulfill, reject) {
      if (config.amazon.backup) {
        let hash = crypto.createHash('sha256');
        hash.update(path);
        s3.upload({
          Key: hash.digest('hex'),
          Body: fileBuffer,
          ContentEncoding: 'base64',
          Metadata: {
            'Content-Type': 'image/jpeg'
          },
          ACL: 'public-read'
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            logger.info('Data: %s', data);
            fulfill(data);
          }
        });
      } else {
        fulfill();
      }
    });
  };

  let getImageDate = function(file, callback) {
    return new Promise(function(fulfill, reject) {
      try {
        console.log('tyope: ', typeof(file))
        gm(file)
        .identify(function(err, data) {
          if (err) {
            logger.warn('[%s] Unable to read metadata from image %s, Error: ', config.abbir.screenName, file.name, err);
            reject(err);
          } else {
            if (data.hasOwnProperty('Profile-EXIF') && (data['Profile-EXIF'].hasOwnProperty('Date Time Original') || data['Profile-EXIF'].hasOwnProperty('Date Time'))) {
              let date = data['Profile-EXIF']['Date Time Original'] || data['Profile-EXIF']['Date Time'];
              let tmp = date.split(' ');
              tmp[0] = tmp[0].split(':').join('-');
              date = moment.tz(tmp[0] + 'T' + tmp[1], 'Europe/Stockholm');
              fulfill(date);
            } else {
              reject(new Error('No EXIF info found'));
            }
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  function readFile(filename) {
    return new Promise(function(fulfill, reject) {
      fs.readFile(filename, function(err, res) {
        logger.debug('[ProcessIncomming] Read file %s', filename);
        if (err) {
          reject(err);
        } else {
          fulfill(res);
        }
      });
    });
  }

  function readdir(path) {
    return new Promise(function(fulfill, reject) {
      fs.readdir(path, function(err, res) {
        logger.debug('[ProcessIncomming] Read dir %s', path);
        if (err) {
          logger.error('[ProcessIncomming] Could not list the directory %s, error: ',
            path,
            err);
          reject(err);
        } else {
          fulfill(res);
        }
      });
    });
  }

  function readJSON(filename) {
    return new Promise(function(fulfill, reject) {
      readFile(filename, 'utf8').then(function(res) {
        logger.debug('[ProcessIncomming] Read jsonfile %s', filename);
        try {
          fulfill(JSON.parse(res));
        } catch (ex) {
          reject(ex);
        }
      }, reject);
    });
  }
}

util.inherits(ProcessIncomming, EventEmitter);
// Exports
module.exports = ProcessIncomming;
