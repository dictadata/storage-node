/**
 * accounts.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const storage = require('@dictadata/storage-junctions');
const StorageError = storage.Types.StorageError;
const Account = require('./account');
const roles = require('./roles');
const config = require('./config');
const logger = require("./logger");
const fs = require("fs/promises");
const path = require("path");
const typeOf = storage.Types.typeOf;

exports.defaultRoles = [roles.Public];
//if (process.env.NODE_ENV === 'development')
//  defaultRoles = [roles.Public, roles.User, roles.Admin, roles.Monitor];

var accountsEncoding;

/**
 * wait until server config is updated before initializing
 */
exports.startup = async (config) => {
  logger.info("accounts startup");
  logger.verbose("accounts SMT: " + JSON.stringify(config.smt.$_accounts));

  var exitCode = 0;
  var junction;
  try {
    // add any app/api roles
    Object.assign(roles, config.roles);

    accountsEncoding = JSON.parse(await fs.readFile(path.join(__dirname, 'accounts_encoding.json')));

    junction = await storage.activate(config.smt.$_accounts, {encoding: accountsEncoding});
    let results = await junction.encoding;
    if (typeOf(results) === "object") {
      logger.verbose("accounts schema exists");
      junction.encoding = accountsEncoding;  // overlay encoding overlay
    }
    else {
      // create source
      let results = await junction.createSchema();
      if (typeOf(results) !== "object")
        throw new StorageError({ statusCode: 500 }, "could not create accounts schema");

      // create admin account
      let account = new Account('admin');
      account.password = Account.hashPwd('admin');
      account.roles = [roles.Public, roles.User, roles.Admin];
      await store(account);
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
 * retrieve users' account from database
 * @param {*} userid
 */
var recall = exports.recall = async function (userid) {

  let account = null;

  let smt = config.smt.$_accounts;
  let junction = await storage.activate(smt);
  junction.encoding = accountsEncoding;  // overlay encoding overlay

  let pattern = {};
  if (junction.engram.keyof === 'key')
    pattern["key"] = userid;
  else
    pattern["userid"] = userid;

  let results = await junction.recall(pattern);
  if (results.result === 'ok') {
    account = new Account();
    if (junction.engram.keyof === 'key')
      account.copy(results.data[userid]);
    else
      account.copy(results.data[0]);
  }

  junction.relax();
  return account;
};

/**
 * retrieve account account from database
 * @param {*} pattern: {match: {field: value} }
 */
var retrieve = exports.retrieve = async function (pattern) {

  let account = null;

  let smt = config.smt.$_accounts;
  let junction = await storage.activate(smt);
  junction.encoding = accountsEncoding;  // overlay encoding overlay

  let results = await junction.retrieve(pattern);
  if (results.result === 'ok') {
    let keys = Object.keys(results.data);
    let account = new Account();
    account.copy(results.data[keys[0]]);
  }

  junction.relax();
  return account;
};

/**
 * create account in database
 * @param {*} account
 */
var store = exports.store = async function (account) {

  let smt = config.smt.$_accounts;
  let junction = await storage.activate(smt);
  junction.encoding = accountsEncoding;  // overlay encoding overlay

  account.dateUpdated = new Date().toISOString();
  if (!account.dateCreated)
    account.dateCreated = new Date().toISOString();
  //if (!account.lastLogin)
  //  account.lastLogin = new Date().toISOString();

  let pattern = {};
  if (junction.engram.keyof === 'key') {
    pattern["key"] = account.userid;
  }
  else {
    // pattern not used with primary key
  }

  let results = await junction.store(account.encode(), pattern);
  if (results.result !== 'ok')
    throw new StorageError({ statusCode: 400 }, results.result);
};

/**
 * create account in database
 * @param {*} account
 */
var dull = exports.dull = async function (userid) {

  let smt = config.smt.$_accounts;
  let junction = await storage.activate(smt);
  junction.encoding = accountsEncoding;  // overlay encoding overlay

  let pattern = {};
  if (junction.engram.keyof === 'key')
    pattern["key"] = userid;
  else
    pattern["userid"] = userid;
  
  let results = await junction.dull(pattern);
  if (results.result !== 'ok')
    throw new StorageError({ statusCode: 400 }, results.result);
};
