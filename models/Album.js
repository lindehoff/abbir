var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var AlbumSchema = Schema({
  name: {type: String, required: true},
  owner: {type: Schema.ObjectId, ref: 'User', required: true},
  created: {type: Date, required: true, default: Date.now}
});

//Export model
module.exports = mongoose.model('Album', AlbumSchema);
