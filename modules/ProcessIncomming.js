/**
 * Module for processing incomming files
 *
 * @author Jacob Lindehoff
 * @version 1.0.0
 */

'use strict';
//const fs = require('fs');
//const mkdirp = require('mkdirp');
//const async = require('async');
const s3 = require('s3');

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
}

// Exports
module.exports = ProcessIncomming;
