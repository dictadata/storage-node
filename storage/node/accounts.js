/**
 * storage/node/accounts.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const Account = require('./account');
const Roles = require('./roles');
const config = require('./config');
const { logger } = require('@dictadata/lib')
const { Storage } = require('@dictadata/storage-tracts');
const { StorageError } = require('@dictadata/storage-junctions/types');

const { readFile } = require('node:fs/promises');
const path = require('node:path');

var accountsEngram;

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
    Object.assign(Roles, config.roles);

    accountsEngram = JSON.parse(await readFile(path.join(__dirname, 'accounts.engram.json')));

    junction = await Storage.activate(config.$_accounts, { encoding: accountsEngram });
    // attempt to create accounts schema
    let results = await junction.createSchema();
    if (results.status === 0) {
      logger.info("created accounts schema");
      logger.info("creating admin account");
      let account = new Account('admin');
      account.password = Account.hashPwd('admin');
      account.roles = [ Roles.User, Roles.Admin ];
      results = await store(account);
      if (results.status !== 0 && results.status !== 201) {
        throw new StorageError(500, "unable to create admin account");
      }
    }
    else if (results.status === 409) {
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
  let junction = await Storage.activate(smt);
  junction.encoding = accountsEngram;  // overlay encoding overlay

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

  let construct = account.encode();
  let results = await junction.store(construct, pattern);
  return results;
};

/**
 * create account in database
 * @param {*} account
 */
exports.dull = async function (userid) {

  let smt = config.$_accounts;
  let junction = await Storage.activate(smt);
  junction.encoding = accountsEngram;  // overlay encoding overlay

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
  let junction = await Storage.activate(smt);
  junction.encoding = accountsEngram;  // overlay encoding overlay

  let pattern = {};
  if (junction.engram.keyof === 'key')
    pattern[ "key" ] = userid;
  else
    pattern[ "userid" ] = userid;

  let results = await junction.recall(pattern);
  /*
  if (results.status === 0) {
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

  let junction = await Storage.activate(smt);
  junction.encoding = accountsEngram;  // overlay encoding

  let results = await junction.retrieve(pattern);
  /*
  if (results.status === 0) {
    let keys = Object.keys(results.data);
    let account = new Account();
    account.copy(results.data[ keys[ 0 ] ]);
  }
  */
  junction.relax();
  //return account;
  return results;
};
