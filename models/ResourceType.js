var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var ResourceTypeSchema = Schema({
  name: {type: String, required: true}
});

//Export model
module.exports = mongoose.model('ResourceType', ResourceTypeSchema);
