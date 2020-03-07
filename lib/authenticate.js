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
  logger.info("authenticate startup");
  logger.verbose("accounts SMT: " + JSON.stringify(config.smt.$_accounts));

  var junction;
  try {
    // add any app/api roles
    Object.assign(roles, config.roles);

    let engram = new storage.Engram(config.smt.$_accounts);
    if (engram.keyof !== 'key') {
      throw new StorageError({statusCode: 400}, "invalid key type in config.smt.$_accounts");
    }

    junction = storage.activate(config.smt.$_accounts);

    const accountsEncoding = JSON.parse(fs.readFileSync(path.join(__dirname, 'accounts_encoding.json')));

    let encoding = await junction.putEncoding(accountsEncoding);
    if (encoding)
      logger.info("accounts schema valid: " + junction._engram.smt.schema);
    else
      logger.warn("could not create accounts schema, maybe it already exists");

    // if admin account doesn't exist then create it
    let account = await getAccount('admin');
    if (!account) {
      account = new Account();
      account.userid = 'admin';
      account.password = hashPwd('admin');
      account.roles = [roles.Public, roles.User, roles.Admin];
      await createAccount(account);
    }
  }
  catch (err) {
    logger.error('authenticate startup failed: ' + err.message);
  }
  finally {
    if (junction)
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
 * retrieve users' account from database
 * @param {*} userid
 */
var getAccount = exports.getAccount = async function (userid) {

  let account = null;

  let smt = config.smt.$_accounts;
  let junction = storage.activate(smt);

  let results = await junction.recall({key: userid});
  if (results.result === 'ok')
    account = results.data[userid];

  junction.relax();
  return account;
};

/**
 * retrieve account account from database
 * @param {*} pattern: {match: {field: value} }
 */
var findAccount = exports.findAccount = async function (pattern) {

  let account = null;

  let smt = config.smt.$_accounts;
  let junction = storage.activate(smt);

  let results = await junction.retrieve(pattern);
  if (results.result === 'ok') {
    let keys = Object.keys(results.data);
    account = results.data[keys[0]];
  }

  junction.relax();
  return account;
};

/**
 * create account in database
 * @param {*} account
 */
var createAccount = exports.createAccount = async function (account) {

  let smt = config.smt.$_accounts;
  let junction = storage.activate(smt);

  account.dateCreated = new Date().toISOString();
  account.dateUpdated = new Date().toISOString();
  account.lastLogin = new Date().toISOString();

  let results = await junction.store(account, {key: account.userid});
  if (results.result !== 'ok')
    throw new StorageError({statusCode: 400}, results.result);
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
    let reqAccount = new Account(userid);
    reqAccount.password = password;
    reqAccount.roles = _defaultRoles;

    let account = await getAccount(userid);
    if (!account)
      return done(null, reqAccount);  // not found, public account

    let hpswd = hashPwd(password);
    if (hpswd !== account.password)
      return done(null, reqAccount);  // bad password, public account

    return done(null, account);  // authenticated, valid account
  }
  catch(err) {
    logger.error("authenticate: " + err.message);
    return done(err);  // storage error
  }

};

exports.digest = async function(userid, done) {
  logger.verbose("authenticate digest");
  logger.debug(userid);

  if (!userid)
    return done(null, false);  // HTTP Authorization header missing or corrupt

  try {
    let account = await getAccount(userid);
    if (!account)
      return done(null, false);  // not found

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
