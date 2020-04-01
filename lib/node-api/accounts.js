"use strict";
/**
 * storage-node/account
 */

const express = require("express");
const { hashPwd } = require("../authenticate");
const authorize = require("../authorize");
const roles = require("../roles");
const config = require("../config");
const logger = require("../logger");
const Account = require('../account');
const crypto = require("crypto");
const storage = require("@dictadata/storage-junctions");
const StorageError = storage.StorageError;
const StorageResults = storage.StorageResults;

/**
 * account routes
 */
var router = express.Router();
// account requests
router.get("/account", authorize([roles.Public]), login);
router.post("/account", authorize([roles.Public]), register);
router.put("/account", authorize([roles.User, roles.Admin]), store);
router.delete("/account", authorize([roles.User, roles.Admin]), dull);
// aliases
router.post("/register", authorize([roles.Public]), register);
router.get("/login", authorize([roles.Public]), login);
module.exports = router;

/**
 * Retrieve account record from data store.
 */
async function login(req, res) {
  logger.verbose("/accounts login called");
  // no request body

  var junction;
  try {
    let smt = config.smt.$_accounts;
    junction = await storage.activate(smt);

    // retrieve user account
    let results = await junction.recall({key: req.user.userid});
    if (results.result !== 'ok') {
      // no account record found
      throw new StorageError({statusCode: 401}, "invalid userid/password" );
    }

    // found account record
    let account = new Account();
    account.copy(results.data[req.user.userid]);

    // check password
    if (req.user.password !== account.password) {
      throw new StorageError({ statusCode: 401 }, "invalid userid/password");
    }

    // update last login time
    account.lastLogin = new Date().toISOString();
    results = await junction.store(account, {key: req.user.userid});
    results["data"] = {};
    results.data[req.user.userid] = account.package();

    // return account record
    res.set("Cache-Control", "private, max-age=5, s-maxage=5").jsonp(results);
  }
  catch(error) {
    if (error.statusCode && error.statusCode === 401)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.statusCode || 500).send(error.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}

/**
 * Create a new user record in ElasticSearch.
 * Fails if an account already exists with the provided email address.
 */
async function register(req, res) {
  logger.verbose("/accounts register called");

  var junction;
  try {
    let reqAccount = req.body.account || req.body.data || {};
    let admin = req.user.roles.includes(roles.Admin);

    // existing admin or both passwords should be plain text
    if (!admin && (reqAccount.userid !== req.user.userid))
      throw new StorageError({statusCode: 401}, "invalid userid/password");
    if (!admin && reqAccount.password !== req.user.password) {
      if (req.user.isAuthenticated)
        throw new StorageError({statusCode: 409}, "account already exists");
      else
        throw new StorageError({statusCode: 401}, "invalid userid/password");
    }

    let smt = config.smt.$_accounts;
    junction = await storage.activate(smt);

    // double check account doesn't exist
    let results = await junction.recall({key: reqAccount.userid});
    if (results.result === 'ok')
      throw new StorageError({statusCode: 409}, "account already exists");

    // index new user account
    let newAccount = new Account(reqAccount.userid);
    newAccount.update(reqAccount);
    newAccount.password = hashPwd(reqAccount.password);
    newAccount.roles = (admin && reqAccount.roles) || [roles.Public, roles.User];
    newAccount.dateCreated = new Date().toISOString();
    newAccount.dateUpdated = new Date().toISOString();
    newAccount.lastLogin = new Date().toISOString();

    // TODO copy other user profile info from req.body.account

    results = await junction.store(newAccount, {key: newAccount.userid});
    results["data"] = {};
    results.data[newAccount.userid] = newAccount.package();

    // return user's record
    res.status(201).set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.statusCode && error.statusCode === 409)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.statusCode || 500).set('Content-Type', 'text/html').send(error.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}

/**
 * Update account record in ElasticSearch.  Inserts if it doesn't exist.
 */
async function store(req, res) {
  logger.verbose("/accounts store called");

  var junction;
  try {
    let reqAccount = req.body.account || req.body.data || {};
    let admin = req.user.roles.includes(roles.Admin);

    if (!admin && (reqAccount.userid !== req.user.userid || hashPwd(reqAccount.password) !== req.user.password))
      throw new StorageError({statusCode: 401}, "invalid userid/password");

    let smt = config.smt.$_accounts;
    junction = await storage.activate(smt);

    // find the user's account
    let results = await junction.recall({key: reqAccount.userid});
    if (results.result !== 'ok')
      throw new StorageError({statusCode: 404}, "account not found");
    let oldAccount = results.data[reqAccount.userid];

    let modAccount = new Account(reqAccount.userid);
    modAccount.copy(oldAccount);
    modAccount.update(reqAccount);
    modAccount.password = hashPwd(reqAccount.password);
    if (admin) modAccount.roles = reqAccount.roles;
    modAccount.dateUpdated = new Date().toISOString();

    // save the updated user account
    results = await junction.store(modAccount, {key: modAccount.userid});
    results.data[modAccount.userid] = modAccount.package();

    // return user's record
    res.set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.statusCode && error.statusCode === 401)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.statusCode || 500).set('Content-Type', 'text/html').send(error.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}

/**
 * Disable user account.
 */
async function dull(req, res) {
  logger.verbose("/accounts dull called");

  var junction;
  try {
    let reqAccount = req.body.account || req.body.data || req.body;
    let userid = reqAccount.userid || req.params["userid"];
    let password = hashPwd(reqAccount.password || req.params["password"] || '');
    let admin = req.user.roles.includes(roles.Admin);

    if (!admin && (userid !== req.user.userid || password !== req.user.password))
      throw new StorageError({statusCode: 401}, "invalid userid/password");

    let smt = config.smt.$_accounts;
    junction = await storage.activate(smt);

    // find the user's account
    let results = await junction.recall({key: userid});
    if (results.result !== 'ok')
      throw new StorageError({statusCode: 404}, "account not found");
    let oldAccount = results.data[userid];

    // check password
    if (!admin && (password !== oldAccount.password))
      throw new StorageError({ statusCode: 401 }, "invalid userid/password");

    // delete user account
    results = await junction.dull({key: userid});

    res.set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.statusCode && error.statusCode === 401)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.statusCode || 500).set('Content-Type', 'text/html').send(error.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}
