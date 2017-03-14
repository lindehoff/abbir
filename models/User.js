const mongoose = require('mongoose');
const moment = require('moment');
const config = require('./Settings').config;
const util = require('util');

const Schema = mongoose.Schema;

const UserSchema = Schema({
  firstName: {type: String, required: true},
  familyName: {type: String, required: true},
  userName: {type: String, required: true},
  passwordHash: {type: String},
  group: {type: String, required: true,
    enum: ['SuperAdmin', 'Admin', 'Member', 'Email'],
    default: 'Email'
  },
  email: [{type: String, required: true}],
  created: {type: Date, required: true, default: Date.now}
});


// Virtual for "full" name
AuthorSchema
.virtual('name')
.get(function() {
  return util.format('%s %s', this.firstName, this.familyName);
});

//Export model
module.exports = mongoose.model('User', UserSchema);
