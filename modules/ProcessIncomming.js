/**
 * Module for processing incomming files
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
const fs = require('fs');
//const mkdirp = require('mkdirp');
const async = require('async');
//const s3 = require('s3');
const AWS = require('aws-sdk');
const gm = require('gm');
const moment = require('moment-timezone');
const util = require('util');

function ProcessIncomming(config, logger) {
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
        logger.error('[%s] Could not list the directory "%s", error: ',
          config.abbir.screenName,
          path,
          err);
        return;
      }
      let albumInfo = files.find(fileName => fileName === 'info.json');
      if (albumInfo) {
        albumInfo = JSON.parse(fs.readFileSync(path + albumInfo, 'utf8'));
      }
      async.each(files, function(file, callback) {
        let filePath = path + file;
        fs.readFile(filePath, function (err, data) {
          //fs.unlink(file.path, function (err) {
          // if (err) {
          //  console.error(err);
          // }
          // console.log('Temp File Delete');
          //});

          getImageDate(data, function(err, date) {
            if(!err) {
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
              backup(data, newPath + newFileName, function(err, data) {
                if (err) {
                  console.log('There was an error uploading your photo: ', err.message);

                  callback();
                  return;
                }
                console.log('Successfully uploaded photo.');

                callback();
              });
            } else {
              callback();
            }
          });
        });
      }, function(err) {
        console.log('Done');

      });
    });
  };

  let backup = function(fileBuffer, path, callback) {
    s3.upload({
      Key: path,
      Body: fileBuffer
    }, callback);
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
    } catch(err) {
      callback(err);
      return;
    }
  };
}

// Exports
module.exports = ProcessIncomming;
