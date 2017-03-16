const mongoose = require('mongoose');
const moment = require('moment');
const util = require('util');

const Schema = mongoose.Schema;

const ResourceSchema = Schema({
  name: {type: String, required: true},
  owner: {type: Schema.ObjectId, ref: 'User', required: true},
  fileName: {type: String, required: true},
  onlineUrl: {type: String},
  resourceType: {type: Schema.ObjectId, ref: 'ResourceType', required: true},
  album: {type: Schema.ObjectId, ref: 'Album', required: true},
  created: {type: Date, required: true},
  added: {type: Date, required: true, default: Date.now}
});

ResourceSchema
.virtual('localPath')
.get(function() {
  return util.format('%s%s/%s/%s/%s/%s',
    config.abbir.imagePath,
    this.owner.userName,
    moment(this.created).format('YYYY'),
    moment(this.created).format('MM'),
    this.album.name,
    this.fileName
  );
});

//Export model
module.exports = mongoose.model('Resource', ResourceSchema);
