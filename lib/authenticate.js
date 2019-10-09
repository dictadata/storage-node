/**
 * authenticate.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const config = require("./config");
const logger = require("./logger");
const User = require('./user');
const roles = require('./roles');
const storage = require('@dicta-io/storage-junctions');
const StorageError = storage.StorageError;
const accountsEncoding = require('./accounts_encoding');
const crypto = require("crypto");

//const _index = config.realm + "_accounts";

var _defaultRoles = [roles.Public];
//if (process.env.NODE_ENV === 'development')
//  _defaultRoles = [roles.Public, roles.User, roles.Admin, roles.Monitor];

// wait until server config is updated before initializing
exports.startup = async (config) => {
  logger.verbose("authenticate startup");
  logger.info("accounts SMT: " + config.smt.accounts);

  let engram = new storage.Engram(config.smt.accounts);
  if (engram.keyof !== 'key') {
    throw new StorageError({statusCode: 400}, "invalid key type in config.smt.accounts");
  }

  var junction = storage.activate(config.smt.accounts);

  try {
    let encoding = await junction.putEncoding(accountsEncoding);
    if (encoding)
      logger.info("accounts schema valid: " + junction._engram.schema);
    else
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
      if (results.result === 'ok')
        logger.info("created account: admin");
      else
        logger.warn('unable to create admin user' + results);
    }
  }
  catch (err) {
    logger.error('authenticate activate failed: ' + err.message);
  }
  finally {
    junction.relax();
  }
};

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
  logger.verbose("authenticate local");
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
  logger.verbose("authenticate http");
  logger.debug(userid + '/' + password);

  if (!userid)
    return done(null, false);  // HTTP Authorization header missing or corrupt

  try {
    let user = new User(userid);
    user.password = password;
    user.roles = _defaultRoles;

    // retrieve user account
    var smt = config.smt.accounts;
    var junction = storage.activate(smt);

    let results = await junction.recall({userid: userid});
    if (results.result !== 'ok')
      return done(null, user);  // not found, public user

    let userinfo = results.data;
    let ep = hashPwd(password);
    if (userinfo.password !== ep)
      return done(null, user);  // bad password, public user

    user.copy(userinfo);
    return done(null, user);  // authenticated, valid user
  }
  catch(err) {
    logger.error("authenticate: " + err.message);
    return done(err);  // storage error
  }

};
