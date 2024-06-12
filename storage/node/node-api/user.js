/**
 * storage/node/node-api/user
 */
"use strict";

const express = require("express");
const accounts = require("../accounts");
const Account = require('../account');
const authorize = require("../authorize");
const Roles = require("../roles");
const { logger } = require('@dictadata/lib')
const { StorageResults, StorageError } = require("@dictadata/storage-junctions/types");

/**
 * account routes
 */
var router = express.Router();

router.post("/login", authorize([ Roles.Public ]), login);
router.post("/logout", authorize([ Roles.Guest, Roles.User ]), logout);
router.post("/register", authorize([Roles.Public]), register);
router.put("/user", authorize([ Roles.User ]), update);

module.exports = exports = router;

/**
 * Retrieve account record from data store.
 * Check the password and update the login time.
 * @returns Returns the user's account record.
 */
async function login(req, res) {
  logger.verbose("/user/login");

  try {
    // retrieve user account
    let results = await accounts.recall(req.user.userid);
    if (results.status !== 0)
      throw results;  // results should be a StorageError
    let account = new Account(results.data[ req.user.userid ]);

    if (req.user.password !== account.password)
      throw new StorageError(401, "invalid userid/password");

    // update last login time
    account.lastLogin = new Date().toISOString();
    let results2 = await accounts.store(account);

    // return account record
    results2.type = "map";
    results2.data[req.user.userid] = account.sanitize();
    res.status(results2.status || 200).set("Cache-Control", "private, max-age=5, s-maxage=5").jsonp(results2);
  }
  catch(error) {
    if (error?.status === 401)
      logger.warn(error.message);
    else
      logger.error(error.message);
    res.status(error.status || 500).send(error.message);
  }
}

/**
 * Records event in the server logs.
 * @returns Returns "OK" status.
 */
async function logout(req, res) {
  logger.verbose("/user/logout");

  try {
    // retrieve user account
    let results = await accounts.recall(req.user.userid);
    if (results.status !== 0)
      throw results;  // results should be a StorageError
    let account = results.data[ req.user.userid ];

    if (req.user.password !== account.password)
      throw new StorageError(401, "invalid userid/password");

    // update last login time
    // account.lastLogin = new Date().toISOString();
    // results = await accounts.store(account);

    // return results
    results = new StorageResults(0, "OK");
    res.status(results.status || 200).set("Cache-Control", "private, max-age=5, s-maxage=5").jsonp(results);
  }
  catch(error) {
    if (error?.status === 401)
      logger.warn(error.message);
    else
      logger.error(error.message);
    res.status(error.status || 500).send(error.message);
  }
}

/**
 * Create a new user account.
 * Fails if an account already exists with the provided userid.
 */
async function register(req, res) {
  logger.verbose("/user/register");

  try {
    let reqAccount = req.body.account || {};
    if (req.user.userid !== reqAccount.userid)
      throw new StorageError(401, "invalid userid/password");

    // try to recall account
    let results = await accounts.recall(reqAccount.userid);
    if (results.status !== 404)
      throw new StorageError(409, "account already exists");

    if (req.user.password !== reqAccount.password) {
      // both should be plain text and equal for new user request
      throw new StorageError(401, "invalid userid/password");
    }

    // store new user account
    let newAccount = new Account(reqAccount.userid);
    newAccount.update(reqAccount);
    newAccount.password = Account.hashPwd(reqAccount.password);
    newAccount.roles = [ Roles.User ];        // should be Guest until user verifies email address
    newAccount.dateCreated = new Date().toISOString();
    newAccount.dateUpdated = new Date().toISOString();
    newAccount.lastLogin = new Date().toISOString();

    let results2 = await accounts.store(newAccount);

    // return user's record
    results2.type = "map";
    results2.data[newAccount.userid] = newAccount.sanitize();
    res.status(results2.status || 201).set("Cache-Control", "no-store").jsonp(results2);
  }
  catch(error) {
    if (error?.status === 409)
      logger.warn(error.message);
    else
      logger.error(error.message);
    res.status(error.status || 500).set('Content-Type', 'text/plain').send(error.message);
  }
}


/**
 * Update user record in data store.
 */
async function update(req, res) {
  logger.verbose("/user/update");

  try {
    let reqAccount = req.body.account || {};

    if (req.user.userid !== reqAccount.userid)
      throw new StorageError(401, "invalid userid/password");

    // find the user's account
    let results = await accounts.recall(reqAccount.userid);
    if (results.status !== 0)
      throw results;  // results should be a StorageError

    let oldAccount = results.data[ reqAccount.userid ];
    if (req.user.password !== oldAccount.password)
      throw new StorageError(401, "invalid userid/password");

    let modAccount = new Account(oldAccount);
    modAccount.update(reqAccount);  // not userid, password, roles, state
    if (reqAccount.password)
      modAccount.password = Account.hashPwd(reqAccount.password);
    modAccount.dateUpdated = new Date().toISOString();

    // save the updated user account
    let results2 = await accounts.store(modAccount);

    // return user's record
    results2.type = "map";
    results2.data[modAccount.userid] = modAccount.sanitize(); // remove sensitive fields like password
    res.status(results2.status || 200).set("Cache-Control", "no-store").jsonp(results2);
  }
  catch(error) {
    if (error?.status === 401)
      logger.warn(error.message);
    else
      logger.error(error.message);
    res.status(error.status || 500).set('Content-Type', 'text/plain').send(error.message);
  }
}
