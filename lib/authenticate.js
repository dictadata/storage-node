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
const storage = require('@dicta-io/storage-junctions');
const accountsEncoding = require('./accounts_encoding');

//const _index = config.realm + "_accounts";

var _defaultRoles = [roles.Public];
//if (process.env.NODE_ENV === 'development')
//  _defaultRoles = [roles.Public, roles.User, roles.Admin, roles.Monitor];

/**
 *
 */
(async function initialize() {
  logger.verbose("authenticate activate");
  logger.debug(config.accounts_smt);

  var junction = storage.activate(config.accounts_smt);

  try {
    let encoding = await junction.putEncoding(accountsEncoding);
    if (!encoding)
      logger.warn("could not create storage schema, maybe it already exists");

    // check if admin account already exists
    let results = await junction.recall({userid: 'admin'});
    if (results.result !== 'ok') {
      // create admin:admin account
      let user = new User();
      user.userid = 'admin';
      user.password = hashPwd('admin');
      user.roles = [roles.Public, roles.User, roles.Admin];
      user.dateCreated = new Date().toISOString();
      user.dateUpdated = new Date().toISOString();
      user.lastLogin = new Date().toISOString();

      results = await junction.store(user, {userid: 'admin'});
      if (results.result != 'created')
        logger.error('unable to create admin user', results);
    }
  }
  catch (err) {
    logger.error('authenticate activate failed: ' + err.message);
  }
  finally {
    junction.relax();
  }
})();

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
  logger.verbose("authenticate");
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
  logger.verbose("authenticate");
  logger.debug(userid + '/' + password);

  if (!userid)
    return done(null, false);  // HTTP Authorization header missing or corrupt

  try {
    let user = new User(userid);
    user.password = password;
    user.roles = _defaultRoles;

    // retrieve user account
    var smt = config.accounts_smt;
    var junction = storage.activate(smt);

    let results = await junction.recall({userid: userid});
    if (results.result !== 'ok')
      return done(null, user);  // not found, public user

    let userinfo = results.data;
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
