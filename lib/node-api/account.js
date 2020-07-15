"use strict";
/**
 * storage-node/account
 */

const storage = require("@dictadata/storage-junctions");
const StorageError = storage.StorageError;
const StorageResults = storage.StorageResults;
const express = require("express");
const accounts = require("../accounts");
const Account = require('../account');
const authorize = require("../authorize");
const roles = require("../roles");
const config = require("../config");
const logger = require("../logger");

/**
 * account routes
 */
var router = express.Router();
// account requests
router.get("/account", authorize([roles.Public]), login);
router.post("/account", authorize([roles.Public]), register);
router.put("/account", authorize([roles.User, roles.Admin]), store);
router.delete("/account", authorize([roles.User, roles.Admin]), dull);
router.delete("/account/:userid", authorize([roles.User, roles.Admin]), dull);
// aliases
router.post("/register", authorize([roles.Public]), register);
router.get("/login", authorize([roles.Public]), login);
module.exports = router;

/**
 * Retrieve account record from data store.
 */
async function login(req, res) {
  logger.verbose("/accounts/login");
  // no request body

  var junction;
  try {
    // retrieve user account
    let account = await accounts.recall(req.user.userid);
    if (!account)
      throw new StorageError({statusCode: 401}, "invalid userid/password" );

    if (req.user.password !== account.password)
      throw new StorageError({ statusCode: 401 }, "invalid userid/password");

    // update last login time
    account.lastLogin = new Date().toISOString();
    await accounts.store(account);

    // return account record
    let results = new StorageResults("ok", account.package(), req.user.userid);
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
 * Create a new user account.
 * Fails if an account already exists with the provided userid.
 */
async function register(req, res) {
  logger.verbose("/accounts/register");

  var junction;
  try {
    let reqAccount = req.body.account || req.body.data || {};
    let admin = req.user.roles.includes(roles.Admin);

    if (!admin && (req.user.userid !== reqAccount.userid))
      throw new StorageError({statusCode: 401}, "invalid userid/password");

    // try to recall account
    let account = await accounts.recall(reqAccount.userid);
    if (account)
      throw new StorageError({statusCode: 409}, "account already exists");

    if (!admin && req.user.password !== reqAccount.password) {
      // both should be plain text and equal for new user request
      throw new StorageError({statusCode: 401}, "invalid userid/password");
    }

    // store new user account
    let newAccount = new Account(reqAccount.userid);
    newAccount.update(reqAccount);
    newAccount.password = Account.hashPwd(reqAccount.password);
    newAccount.roles = (admin && reqAccount.roles) || [roles.Public, roles.User];
    newAccount.dateCreated = new Date().toISOString();
    newAccount.dateUpdated = new Date().toISOString();
    newAccount.lastLogin = new Date().toISOString();

    await accounts.store(newAccount);

    // return user's record
    let results = new StorageResults("ok", newAccount.package(), newAccount.userid);
    res.status(201).set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.statusCode && error.statusCode === 409)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.statusCode || 500).set('Content-Type', 'text/plain').send(error.message);
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
  logger.verbose("/accounts/store");

  var junction;
  try {
    let reqAccount = req.body.account || req.body.data || {};
    let admin = req.user.roles.includes(roles.Admin);

    if (!admin && (req.user.userid !== reqAccount.userid))
      throw new StorageError({statusCode: 401}, "invalid userid/password");

    // find the user's account
    let oldAccount = await accounts.recall(reqAccount.userid);
    if (!oldAccount)
      throw new StorageError({statusCode: 404}, "account not found");

    if (!admin && req.user.password !== oldAccount.password)
      throw new StorageError({statusCode: 401}, "invalid userid/password");

    let modAccount = new Account(reqAccount.userid);
    modAccount.copy(oldAccount);
    modAccount.update(reqAccount);
    if (reqAccount.password)
      modAccount.password = Account.hashPwd(reqAccount.password);
    if (admin && reqAccount.roles)
      modAccount.roles = reqAccount.roles;
    modAccount.dateUpdated = new Date().toISOString();

    // save the updated user account
    await accounts.store(modAccount);

    // return user's record
    let results = new StorageResults("ok", modAccount.package(), modAccount.userid);
    res.set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.statusCode && error.statusCode === 401)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.statusCode || 500).set('Content-Type', 'text/plain').send(error.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}

/**
 * Disable user account
 */
async function dull(req, res) {
  logger.verbose("/accounts dull called");

  var junction;
  try {
    let reqAccount = req.body.account || req.body.data || req.body;
    let userid = reqAccount.userid || req.query["userid"] ||  req.params["userid"];
    let admin = req.user.roles.includes(roles.Admin);

    if (!admin && (req.user.userid !== userid))
      throw new StorageError({statusCode: 401}, "invalid userid/password");

    // find the user's account
    let account = await accounts.recall(userid);
    if (!account)
      throw new StorageError({statusCode: 404}, "account not found");

    if (!admin && (req.user.password !== account.password))
      throw new StorageError({statusCode: 401}, "invalid userid/password");

    // delete user account
    await accounts.dull(userid);

    let results = new StorageResults("ok");
    res.set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.statusCode && error.statusCode === 401)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.statusCode || 500).set('Content-Type', 'text/plain').send(error.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}
