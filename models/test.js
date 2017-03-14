const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/myappdatabase');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var Album = require('./Album');
var album = new Album(
  {name: 'Julen 2016'}
);
album.save(function(err) {
  if (err) {
    console.log('err: ', err);
  } else {
    console.log('Saved');
  }
  mongoose.disconnect((err) => {
    if(err) {
      console.log('Error: ', err)
    } else {
      console.log('Disconnected');
    }
  });
});
