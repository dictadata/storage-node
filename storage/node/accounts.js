/**
 * storage/node/accounts.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const storage = require('@dictadata/storage-junctions');
const { StorageError } = require('@dictadata/storage-junctions/types');
const Account = require('./account');
const roles = require('./roles');
const config = require('./config');
const logger = require("../utils/logger");
const fs = require("fs/promises");
const path = require("path");

exports.defaultRoles = [ roles.Public ];
//if (process.env.NODE_ENV === 'development')
//  defaultRoles = [roles.Public, roles.User, roles.Monitor];

var accountsEncoding;

/**
 * wait until server config is updated before initializing
 */
exports.startup = async (config) => {
  logger.info("accounts startup");
  logger.verbose("accounts SMT: " + JSON.stringify(config.$_accounts));

  var exitCode = 0;
  var junction;
  try {
    // add any app/api roles
    Object.assign(roles, config.roles);

    accountsEncoding = JSON.parse(await fs.readFile(path.join(__dirname, 'accounts_encoding.json')));

    junction = await storage.activate(config.$_accounts, { encoding: accountsEncoding });
    // attempt to create accounts schema
    let results = await junction.createSchema();
    if (results.resultCode === 0) {
      logger.info("created accounts schema");
      logger.info("creating admin account");
      let account = new Account('admin');
      account.password = Account.hashPwd('admin');
      account.roles = [ roles.User, roles.Admin ];
      results = await store(account);
      if (results.resultCode !== 201) {
        throw new StorageError(500, "unable to create admin account");
      }
    }
    else if (results.resultCode === 409) {
      logger.verbose("accounts schema exists");
    }
    else {
      throw new StorageError(500, "unable to create accounts schema");
    }
  }
  catch (err) {
    logger.error('accounts startup failed: ', err);
    exitCode = 2; // startup failure
  }
  finally {
    if (junction)
      junction.relax();
  }

  return exitCode;
};

/**
 * create account in database
 * @param {*} account
 */
var store = exports.store = async function (account) {

  let smt = config.$_accounts;
  let junction = await storage.activate(smt);
  junction.encoding = accountsEncoding;  // overlay encoding overlay

  account.dateUpdated = new Date().toISOString();
  if (!account.dateCreated)
    account.dateCreated = new Date().toISOString();
  //if (!account.lastLogin)
  //  account.lastLogin = new Date().toISOString();

  let pattern = {};
  if (junction.engram.keyof === 'key') {
    pattern[ "key" ] = account.userid;
  }
  else {
    // pattern not used with primary key
  }

  let results = await junction.store(account.encode(), pattern);
  return results;
};

/**
 * create account in database
 * @param {*} account
 */
exports.dull = async function (userid) {

  let smt = config.$_accounts;
  let junction = await storage.activate(smt);
  junction.encoding = accountsEncoding;  // overlay encoding overlay

  let pattern = {};
  if (junction.engram.keyof === 'key')
    pattern[ "key" ] = userid;
  else
    pattern[ "userid" ] = userid;

  let results = await junction.dull(pattern);
  return results;
};

/**
 * retrieve users' account from database
 * @param {*} userid
 */
exports.recall = async function (userid) {

  //let account = null;

  let smt = config.$_accounts;
  let junction = await storage.activate(smt);
  junction.encoding = accountsEncoding;  // overlay encoding overlay

  let pattern = {};
  if (junction.engram.keyof === 'key')
    pattern[ "key" ] = userid;
  else
    pattern[ "userid" ] = userid;

  let results = await junction.recall(pattern);
  /*
  if (results.resultCode === 0) {
    account = new Account();
    if (junction.engram.keyof === 'key')
      account.copy(results.data[ userid ]);
    else
      account.copy(results.data[ 0 ]);
  }
  */
  junction.relax();
  //return account;
  return results;
};

/**
 * retrieve account account from database
 * @param {*} pattern: {match: {field: value} }
 */
exports.retrieve = async function (pattern) {

  //let accounts = null;

  let smt = config.$_accounts;

  let junction = await storage.activate(smt);
  junction.encoding = accountsEncoding;  // overlay encoding

  let results = await junction.retrieve(pattern);
  /*
  if (results.resultCode === 0) {
    let keys = Object.keys(results.data);
    let account = new Account();
    account.copy(results.data[ keys[ 0 ] ]);
  }
  */
  junction.relax();
  //return account;
  return results;
};
