const async = require('async');
const Database = require('./modules/Database.js');
const Resource = require('./models/Resource');
const ResourceType = require('./models/ResourceType');
const User = require('./models/User');
const Album = require('./models/Album');

let users = [];
let resourceTypes = [];
let albums = [];
let resources = [];

function userCreate(firstName, familyName, userName, group, email, cb) {
  userDetail = {
    firstName: firstName,
    familyName: familyName,
    userName: userName,
    group: group,
    email: email
  };
  let user = new User(userDetail);
  user.save(function(err) {
    if (err) {
      cb(err, null);
      return;
    }
    console.log('New user: ' + user);
    users.push(user);
    cb(null, user);
  });
}

function resourceTypeCreate(name, cb) {
  let resourceType = new ResourceType({name: name});
  resourceType.save(function(err) {
    if (err) {
      cb(err, null);
      return;
    }
    console.log('New resourceType: ' + resourceType);
    resourceTypes.push(resourceType);
    cb(null, resourceType);
  });
}

function albumCreate(name, owner, cb) {
  let album = new Album(
    {
      name: name,
      owner: owner
    }
  );
  album.save(function(err) {
    if (err) {
      cb(err, null);
      return;
    }
    console.log('New album: ' + album);
    albums.push(album);
    cb(null, album);
  });
}

function resourceCreate(name, owner, fileName, resourceType, album, created, cb) {
  resourceDetail = {
    name: name,
    owner: owner,
    fileName: fileName,
    resourceType: resourceType,
    album: album,
    created: created,
  };

  let resource = new Resource(resourceDetail);
  resource.save(function(err) {
    if (err) {
      cb(err, null);
      return;
    }
    console.log('New resource: ' + resource);
    resources.push(resource);
    cb(null, resource);
  });
}

function createResourceTypesUsers(cb) {
  async.parallel(
    [
      function(callback) {
        resourceTypeCreate('image', callback);
      },
      function(callback) {
        resourceTypeCreate('video', callback);
      },
      function(callback) {
        userCreate('Jacob', 'Lindehoff', 'lindehoff', 'Admin', ['jacob@lindehoff.com', 'jacob.lindehoff@lnu.se'], callback);
      },
      function(callback) {
        userCreate('Thomas', 'Nilsson', 'tnilsson', 'Member', ['nilsson@wtre.net'], callback);
      },
    ],
    cb
  );
}

function createAlbums(cb) {
  async.parallel(
    [
      function(callback) {
        albumCreate('Julen 2010', users[1], callback);
      },
      function(callback) {
        albumCreate('Sommar 2011', users[1], callback);
      },
      function(callback) {
        albumCreate('Barnkalas', users[0], callback);
      }
    ],
    cb
  );
}

function createResources(cb) {
  async.parallel(
    [
      function(callback) {
        resourceCreate('Julen 2011 01', users[1], 'Julen 2011 01.jpg', resourceTypes[0], albums[0], new Date(2016, 11, 24), callback);
      },function(callback) {
        resourceCreate('Julen 2011 02', users[1], 'Julen 2011 02.jpg', resourceTypes[0], albums[0], new Date(2016, 11, 24), callback);
      },function(callback) {
        resourceCreate('Sommar 2011 01', users[0], 'Sommar 2011 01.jpg', resourceTypes[0], albums[1], new Date(2016, 6, 3), callback);
      }
    ],
    cb
  );
}

async.series([
    createResourceTypesUsers,
    createAlbums,
    createResources
],
// optional callback
function(err, results) {
  if (err) {
    console.log('FINAL ERR: ' + err);
  } else {
    console.log('Resources: ' + resources);
  }
  //All done, disconnect from database
  console.log('Close DB');
  Database.mongoose.connection.close();
});
