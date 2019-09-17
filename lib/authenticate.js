/**
 * authenticate.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const crypto = require("crypto");
const config = require("./config");
const logger = require("./logger");
const User = require('./user');
const roles = require('./roles');
const storage = require('@dicta.io/storage-junctions');

//const _index = config.realm + "_accounts";

var _defaultRoles = [roles.Public];
//if (process.env.NODE_ENV === 'development')
//  _defaultRoles = [roles.Public, roles.User, roles.Admin, roles.DevOps, roles.Monitor];

/**
 * Function to hash plain text passwords.
 *
 * @param pwd The string to be hashed.
 * @returns {*} A string containing the hash results.
 */
function hashPwd(pwd) {
  var hash = crypto.createHash("sha1");
  hash.update(pwd, "utf8");
  return hash.digest("base64");
}

/**
 * Passport callback for handling LocalStrategy requests
 */
exports.local = function (username, password, done) {
  //console.log("authenticate");
  let user = new User();
  user.name = username;
  user.password = password;
  user.roles = _defaultRoles;
  return done(null, user);
};

/**
 * Passport callback for handling HttpStrategy requests
 */
exports.http = async function (userid, password, done) {
  //console.log("authenticate");
  //console.log(userid + '/' + password);

  if (!userid)
    return done(null, false);  // HTTP Authorization header missing or corrupt

  let user = new User(userid);
  user.password = password;
  user.roles = _defaultRoles;

  // retrieve user account
  var smt = config.accounts_smt;
  var junction = storage.create(smt);

  let pattern = {
    filter: {
      "userid": userid
    }
  };

  try {
    //let results = await junction.retrieve(pattern);
    let userinfo = await junction.recall({key: userid});
    if (userinfo === null)
      return done(null, user);  // not found, public user

    if (userinfo.password !== hashPwd(password))
      return done(null, user);  // bad password, public user

    user.copy(userinfo);
    return done(null, user);  // authenticated, valid user
  }
  catch(err) {
    logger.error("authenticate: ", err.message);
    return done(err);  // storage error
  }

};
