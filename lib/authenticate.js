/**
 * authenticate.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const config = require("./config");
const logger = require("./logger");
const Account = require('./account');
const roles = require('./roles');
const storage = require('@dictadata/storage-junctions');
const StorageError = storage.StorageError;
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const _defaultRoles = [roles.Public];
//if (process.env.NODE_ENV === 'development')
//  _defaultRoles = [roles.Public, roles.User, roles.Admin, roles.Monitor];


/**
 * wait until server config is updated before initializing
 */
exports.startup = async (config) => {
  logger.verbose("authenticate startup");
  logger.info("accounts SMT: " + config.smt.$_accounts);

  // add any app/api roles
  Object.assign(roles, config.roles);

  let engram = new storage.Engram(config.smt.$_accounts);
  if (engram.keyof !== 'key') {
    throw new StorageError({statusCode: 400}, "invalid key type in config.smt.$_accounts");
  }

  let junction = storage.activate(config.smt.$_accounts);

  try {
    const accountsEncoding = JSON.parse(fs.readFileSync(path.join(__dirname, 'accounts_encoding.json')));

    let encoding = await junction.putEncoding(accountsEncoding);
    if (encoding)
      logger.info("accounts schema valid: " + junction._engram.smt.schema);
    else
      logger.warn("could not create accounts schema, maybe it already exists");

    // check if admin account already exists
    let results = await junction.recall({userid: 'admin'});
    if (results.result !== 'ok') {
      // create admin:admin account
      let account = new Account();
      account.userid = 'admin';
      account.password = hashPwd('admin');
      account.roles = [roles.Public, roles.User, roles.Admin];
      account.dateCreated = new Date().toISOString();
      account.dateUpdated = new Date().toISOString();
      account.lastLogin = new Date().toISOString();

      results = await junction.store(account, {userid: 'admin'});
      if (results.result === 'ok')
        logger.info("created account: admin");
      else
        logger.warn('unable to create admin account' + results);
    }
  }
  catch (err) {
    logger.error('authenticate startup failed: ' + err.message);
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
  let hash = crypto.createHash("sha1");
  hash.update(pwd, "utf8");
  return hash.digest("base64");
}

/**
 * retrieve account account from database
 * @param {*} userid
 */
let getUser = exports.getUser = async function (userid) {

  let userinfo = null;

  let smt = config.smt.$_accounts;
  let junction = storage.activate(smt);

  let results = await junction.recall({userid: userid});
  if (results.result === 'ok')
    userinfo = results.data;

  return userinfo;
};

/**
 * retrieve account account from database
 * @param {*} pattern: {match: {field: value} }
 */
let findUser = exports.findUser = async function (pattern) {

  let userinfo = null;

  let smt = config.smt.$_accounts;
  let junction = storage.activate(smt);

  let results = await junction.retrieve(pattern);
  if (results.result === 'ok')
    userinfo = results.data[0];

  return userinfo;
};

/**
 * Passport callback for handling LocalStrategy requests
 */
exports.local = function (username, password, done) {
  logger.verbose("authenticate local");
  let account = new Account();
  account.name = username;
  account.password = password;
  account.roles = _defaultRoles;
  return done(null, account);
};

/**
 * Passport callback for handling HttpStrategy requests
 */
exports.basic = async function (userid, password, done) {
  logger.verbose("authenticate basic");
  logger.debug(userid + '/' + password);

  if (!userid)
    return done(null, false);  // HTTP Authorization header missing or corrupt

  try {
    let account = new Account(userid);
    account.password = password;
    account.roles = _defaultRoles;

    let userinfo = getUser(userid);
    if (!userinfo)
      return done(null, account);  // not found, public account

    let ep = hashPwd(password);
    if (userinfo.password !== ep)
      return done(null, account);  // bad password, public account

    account.copy(userinfo);
    return done(null, account);  // authenticated, valid account
  }
  catch(err) {
    logger.error("authenticate: " + err.message);
    return done(err);  // storage error
  }

};

exports.digest = function(userid, done) {
  logger.verbose("authenticate digest");
  logger.debug(userid);

  if (!userid)
    return done(null, false);  // HTTP Authorization header missing or corrupt

  try {
    let account = new Account(userid);
    account.roles = _defaultRoles;

    let userinfo = getUser(userid);
    if (!userinfo)
      return done(null, false);  // not found

    account.copy(userinfo);
    return done(null, account, account.password);  // valid account
  }
  catch(err) {
    logger.error("authenticate: " + err.message);
    return done(err);  // storage error
  }

};

exports.digest_validate = function(params, done) {
  // validate nonces as necessary
  done(null, true);
};
