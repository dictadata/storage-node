/**
 * authenticate.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const accounts = require('./accounts');
const Account = require('./account');
const logger = require("../utils/logger");

/**
 * Passport callback for handling LocalStrategy requests
 */
exports.local = function (username, password, done) {
  logger.verbose("authenticate local");
  let account = new Account();
  account.name = username;
  account.password = password;
  account.roles = accounts.defaultRoles;
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
    reqAccount.roles = accounts.defaultRoles;

    let account = await accounts.recall(userid);
    if (!account)
      return done(null, reqAccount);  // not found, public account

    let hpass = Account.hashPwd(password);
    if (hpass !== account.password)
      return done(null, reqAccount);  // bad password, public account

    account.isAuthenticated = true;
    return done(null, account);  // authenticated, valid account
  }
  catch(err) {
    logger.error("authenticate: ", err);
    return done(err);  // storage error
  }

};

exports.digest = async function(userid, done) {
  logger.verbose("authenticate digest");
  logger.debug(userid);

  if (!userid)
    return done(null, false);  // HTTP Authorization header missing or corrupt

  try {
    let account = await accounts.recall(userid);
    if (!account)
      return done(null, false);  // not found

    return done(null, account, account.password);  // valid account
  }
  catch(err) {
    logger.error("authenticate: ", err);
    return done(err);  // storage error
  }

};

exports.digest_validate = function(params, done) {
  // validate nonces as necessary
  done(null, true);
};
