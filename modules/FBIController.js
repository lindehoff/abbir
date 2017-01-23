/**
* Module for controlling FBI
*
* @author Jacob Lindehoff
* @version 1.0.0
*/

'use strict';
const EventEmitter = require('events').EventEmitter;
const fs = require('fs');
const util = require('util');

function FBIController(config, logger, images) {
  EventEmitter.call(this);
  const self = this;
  let _images;
  Object.defineProperty(this, 'images', {
    enumerable: true,
    get: () => {
      const copy = [];
      for (let item of _images) {
        copy.push(item);
      }
      return copy;
    },

    set: value => {
      if (!Array.isArray(value)) {
        throw new TypeError('The value must be an array.');
      }
      const array = [];
      for (let item of value) {
        if (!(fs.existsSync(item))) {
          throw new TypeError('File must exit');
        }
        array.push(item);
      }
      _images = array;
    }
  });
  this.images = images;
}

util.inherits(FBIController, EventEmitter);
// Exports
module.exports = FBIController;
