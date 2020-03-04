"use strict";
/**
 * storage-node/account
 */

const express = require("express");
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
 * Retrieve account record from data store.
 */
async function login(req, res) {
  logger.verbose("/accounts login called");
  // no request body

  try {
    var smt = config.smt.$_accounts;
    var junction = storage.activate(smt);

    // retrieve user account
    let results = await junction.recall({userid: req.user.userid});
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
    results = await junction.store(account,{userid: req.user.userid});
    results["data"] = {};
    results.data[req.user.userid] = account.package();

    // return account record
    res.set("Cache-Control", "private, max-age=5, s-maxage=5").jsonp(results);
  }
  catch(error) {
    if (error.statusCode && error.statusCode === 401)
      logger.warn(error.message);
    else
      logger.error(error.message);
    res.status(error.statusCode || 500).send(error.message);
  }
}

/**
 * Create a new user record in ElasticSearch.
 * Fails if an account already exists with the provided email address.
 */
async function register(req, res) {
  logger.verbose("/accounts register called");

  try {
    let account = req.body.account || {};
    let userid = account.userid;
    let password = hashPwd(account.password);
    let admin = req.user.roles.includes(roles.Admin);

    if (userid === req.user.userid && password === req.user.password)
      throw new StorageError({ statusCode: 409 }, "account already exists");

    if (!admin && (userid !== req.user.userid || account.password !== req.user.password)) {
      res.status(401).set('Content-Type', 'text/html').send("invalid userid/password");
      return;
    }

    let newAccount = new Account();

    var smt = config.smt.$_accounts;
    var junction = storage.activate(smt);

    // check if account already exists
    let results = await junction.recall({userid: userid});
    if (results.result === 'ok')
      throw new StorageError({statusCode: 409}, "account already exists");

    // index new user account
    newAccount.update(account);
    newAccount.password = password;
    newAccount.roles = (admin && account.roles) || [roles.Public, roles.User];
    newAccount.dateCreated = new Date().toISOString();
    newAccount.dateUpdated = new Date().toISOString();
    newAccount.lastLogin = new Date().toISOString();
    // TODO copy other user profile info from req.body.account

    results = await junction.store(newAccount,{userid: userid});
    results["data"] = {};
    results.data[userid] = newAccount.package();

    // return user's record
    res.status(201).set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.statusCode && error.statusCode === 409)
      logger.warn(error.message);
    else
      logger.error(error.message);
    res.status(error.statusCode || 500).set('Content-Type', 'text/html').send(error.message);
  }
}

/**
 * Update account record in ElasticSearch.  Inserts if it doesn't exist.
 */
async function store(req, res) {
  logger.verbose("/accounts store called");

  try {
    let account = req.body.account || {};
    let userid = account.userid;
    let password = hashPwd(account.password);
    let admin = req.user.roles.includes(roles.Admin);

    if (!admin && (userid !== req.user.userid || password !== req.user.password)) {
      res.status(401).set('Content-Type', 'text/html').send("invalid userid/password");
      return;
    }

    let modAccount = new Account();

    var smt = config.smt.$_accounts;
    var junction = storage.activate(smt);

    // find the user's account
    let results = await junction.recall({userid: userid});
    if (results.result !== 'ok')
      throw new StorageError({statusCode: 401}, "invalid userid/password");

    let userinfo = results.data[userid];
    modAccount.copy(userinfo);
    modAccount.update(account);
    modAccount.password = password;
    modAccount.roles = (admin && account.roles) || [roles.Public, roles.User];
    modAccount.dateUpdated = new Date().toISOString();

    // save the updated user account
    results = await junction.store(modAccount,{userid: userid});
    results["data"] = {};
    results.data[userid] = modAccount.package();

    // return user's record
    res.set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.statusCode && error.statusCode === 401)
      logger.warn(error.message);
    else
      logger.error(error.message);
    res.status(error.statusCode || 500).set('Content-Type', 'text/html').send(error.message);
  }
}

/**
 * Disable user account.
 */
async function dull(req, res) {
  logger.verbose("/accounts dull called");

  try {
    let account = req.body.account || {};
    let userid = account.userid;
    let password = hashPwd(account.password || '');
    let admin = req.user.roles.includes(roles.Admin);

    if (!admin && (userid !== req.user.userid || password !== req.user.password)) {
      res.status(401).set('Content-Type', 'text/html').send("invalid userid/password");
      return;
    }

    var smt = config.smt.$_accounts;
    var junction = storage.activate(smt);

    // find the user's account
    let results = await junction.recall({userid: userid});
    if (results.result !== 'ok')
      throw new StorageError({statusCode: 401}, "invalid userid/password");
    let userinfo = results.data[userid];

    // check password
    if (!admin && (password !== userinfo.password))
      throw new StorageError({ statusCode: 401 }, "invalid userid/password");

    // delete user account
    results = await junction.dull({userid: userid});

    res.set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.statusCode && error.statusCode === 401)
      logger.warn(error.message);
    else
      logger.error(error.message);
    res.status(error.statusCode || 500).set('Content-Type', 'text/html').send(error.message);
  }
}
