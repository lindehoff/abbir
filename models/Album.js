var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var AlbumSchema = Schema({
  name: {type: String, required: true}
});

//Export model
module.exports = mongoose.model('Album', AlbumSchema);
