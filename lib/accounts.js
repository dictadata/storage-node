/**
 * accounts.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const storage = require('@dictadata/storage-junctions');
const StorageError = storage.StorageError;
const Account = require('./account');
const roles = require('./roles');
const config = require('./config');
const logger = require("./logger");
const fs = require("fs");
const path = require("path");

exports.defaultRoles = [roles.Public];
//if (process.env.NODE_ENV === 'development')
//  defaultRoles = [roles.Public, roles.User, roles.Admin, roles.Monitor];

/**
 * wait until server config is updated before initializing
 */
exports.startup = async (config) => {
  logger.info("accounts startup");
  logger.verbose("accounts SMT: " + JSON.stringify(config.smt.$_accounts));

  var junction;
  try {
    // add any app/api roles
    Object.assign(roles, config.roles);

    let engram = new storage.Engram(config.smt.$_accounts);
    if (engram.keyof !== 'key')
      throw new StorageError({ statusCode: 400 }, "invalid key type in config.smt.$_accounts");

    const accountsEncoding = JSON.parse(fs.readFileSync(path.join(__dirname, 'accounts_encoding.json')));

    junction = await storage.activate(config.smt.$_accounts);
    let encoding = await junction.getEncoding();
    if (typeof encoding === "object")
      logger.verbose("accounts schema exists");
    else {
      let encoding = await junction.putEncoding(accountsEncoding);
      if (typeof encoding !== "object")
        throw new Error("could not create accounts schema");

      // create admin account
      let account = new Account('admin');
      account.password = Account.hashPwd('admin');
      account.roles = [roles.Public, roles.User, roles.Admin];
      await store(account);
    }
  }
  catch (err) {
    logger.error('accounts startup failed: ', err);
  }
  finally {
    if (junction)
      junction.relax();
  }
};

/**
 * retrieve users' account from database
 * @param {*} userid
 */
var recall = exports.recall = async function (userid) {

  let account = null;

  let smt = config.smt.$_accounts;
  let junction = await storage.activate(smt);

  let results = await junction.recall({key: userid});
  if (results.result === 'ok') {
    account = new Account();
    account.copy(results.data[userid]);
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

  account.dateUpdated = new Date().toISOString();
  if (!account.dateCreated)
    account.dateCreated = new Date().toISOString();
  //if (!account.lastLogin)
  //  account.lastLogin = new Date().toISOString();

  let results = await junction.store(account, {key: account.userid});
  if (results.result !== 'ok')
    throw new StorageError({statusCode: 400}, results.result);
};

/**
 * create account in database
 * @param {*} account
 */
var dull = exports.dull = async function (userid) {

  let smt = config.smt.$_accounts;
  let junction = await storage.activate(smt);

  let results = await junction.dull({key: userid});
  if (results.result !== 'ok')
    throw new StorageError({statusCode: 400}, results.result);
};
