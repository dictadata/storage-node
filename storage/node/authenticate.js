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
    let reqAccount = new Account({ userid, password }); // Roles.Guest, state !isAuthenticated

    let results = await accounts.recall(userid);
    if (results.status === 404)
      return done(null, reqAccount);  // not found
    else if (results.status !== 0)
      throw results;  // results should be a StorageError

    let account = new Account(results.data[ userid ]);

    if (account.password !== Account.hashPwd(password))
      return done(null, reqAccount);  // bad password

    account.isAuthenticated = true;
    return done(null, account);  // authenticated account
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
    let results = await accounts.recall(userid);
    if (results.status !== 0)
      return done(null, false);  // not found, reject request

    let account = new Account(results.data[ userid ]);

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
