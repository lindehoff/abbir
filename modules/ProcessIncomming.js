/**
 * Module for processing incomming files
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
const fs = require('fs');
//const mkdirp = require('mkdirp');
//const async = require('async');
const s3 = require('s3');
const gm = require('gm');
const moment = require('moment-timezone');

function ProcessIncomming(config, logger) {
  const client = s3.createClient({
    maxAsyncS3: 5,     // this is the default
    s3RetryCount: 3,    // this is the default
    s3RetryDelay: 1000, // this is the default
    multipartUploadThreshold: 20971520, // this is the default (20 MB)
    multipartUploadSize: 15728640, // this is the default (15 MB)
    s3Options: config.amazon.s3Options
  });

  this.stop = function() {
    logger.warn('[%s] Stoped processing incomming files',
      config.abbir.screenName);
  };

  this.processDir = function(path) {
    fs.readdir(path, function( err, files ) {
      if( err ) {
        console.error( "Could not list the directory.", err );
      }

      files.forEach( function( file, index ) {
        //console.log(file)
        getImageDate(path + file, function(err, date) {
          if(!err) {
            console.log(date);
          }
        });
      });
    });
  }

  let uploadToS3 = function(path) {
    const params = {
      localDir: path,
      deleteRemoved: false,
      s3Params: {
        Bucket: config.amazon.imageBucket,
        Prefix: config.abbir.owner + '/'
      },
    };
    logger.info('[%s] Uploading %s to Amazon S3',
      config.abbir.screenName,
      path);
    const uploader = client.uploadDir(params);
    uploader.on('error', function(err) {
      logger.error('[%s] Unable to uploading %s to Amazon S3, error: ',
        config.abbir.screenName,
        path,
        err);
    });
    uploader.on('end', function() {
      logger.info('[%s] Successfully upload %s to Amazon S3',
        config.abbir.screenName,
        path);
    });
  };

  let getImageDate = function(file, callback) {
    let date;
    try {
      gm(file)
      .identify(function (err, data) {
        if (err) {
          logger.warn('[%s] Unable to read metadata from image %s, Error: ', config.abbir.screenName, file.name, err);
          callback(err);
        } else {
          if (data.hasOwnProperty('Profile-EXIF') && (data['Profile-EXIF'].hasOwnProperty('Date Time Original') || data['Profile-EXIF'].hasOwnProperty('Date Time'))) {
            date = data['Profile-EXIF']['Date Time Original'] || data['Profile-EXIF']['Date Time'];
            let tmp = date.split(' ');
            tmp[0] = tmp[0].split(':').join('-');
            date = moment.tz(tmp[0] + 'T' + tmp[1], 'Europe/Stockholm');
            callback(null, date);
          } else {
            callback(new Error('No EXIF info found'));
          }
        }
      });
    } catch(err) {
      callback(err);
    }
  };
}

// Exports
module.exports = ProcessIncomming;
