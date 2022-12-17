"use strict";
/**
 * storage-node/account
 */

const storage = require("@dictadata/storage-junctions");
const { StorageResults, StorageError } = require("@dictadata/storage-junctions/types");
const express = require("express");
const accounts = require("../accounts");
const Account = require('../account');
const authorize = require("../authorize");
const roles = require("../roles");
const config = require("../config");
const logger = require("../../utils/logger");

/**
 * account routes
 */
var router = express.Router();

router.post("/login", authorize([ roles.Public ]), login);
router.post("/logout", authorize([ roles.Guest, roles.User ]), logout);
router.post("/logout/:userid", authorize([ roles.Guest, roles.User ]), logout);
router.post("/log", authorize([ roles.Guest, roles.User]), logEvent); // /log is probably not used

// account requests
router.get("/account", authorize([roles.User]), recall);
router.get("/account/:userid", authorize([roles.User]), recall);

router.post("/register", authorize([roles.Public]), register);
router.post("/account", authorize([roles.Public]), register);

router.put("/account", authorize([roles.User]), store);

router.delete("/account", authorize([roles.User]), dull);
router.delete("/account/:userid", authorize([roles.User]), dull);

module.exports = router;

/**
 * Retrieve account record from data store.
 * Check the password and update the login time.
 * @returns Returns the user's account record.
 */
async function login(req, res) {
  logger.verbose("/accounts/login");
  let user = req.body.account || req.body;
  let userid = req.params[ "userid" ] || req.query[ "userid" ] || user.userid || req.user.userid;
  let password = req.query[ "password" ] || user.password || req.user.password;

  try {
    // retrieve user account
    let account = await accounts.recall(userid);
    if (!account)
      throw new StorageError(401, "invalid userid/password" );

    if (account.password !== password)
      throw new StorageError(401, "invalid userid/password");

    // update last login time
    account.lastLogin = new Date().toISOString();
    let results = await accounts.store(account);

    // return account record
    results.type = "map";
    results.data[req.user.userid] = account.packet();
    res.status(results.resultCode || 200).set("Cache-Control", "private, max-age=5, s-maxage=5").jsonp(results);
  }
  catch(error) {
    if (error.resultCode && error.resultCode === 401)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.resultCode || 500).send(error.message);
  }
}

/**
 * Records event in the server logs.
 * @returns Returns "OK" status.
 */
async function logout(req, res) {
  logger.verbose("/accounts/login");
  let user = req.body.account || req.body;
  let userid = req.params[ "userid" ] || req.query[ "userid" ] || user.userid || req.user.userid;

  try {
    // retrieve user account
    let account = await accounts.recall(userid);
    if (!account)
      throw new StorageError(401, "invalid userid/password" );

    if (req.user.password !== account.password)
      throw new StorageError(401, "invalid userid/password");

    // update last login time
    account.lastLogin = new Date().toISOString();
    let results = await accounts.store(account);

    // return account record
    results.type = "map";
    results.data[req.user.userid] = account.packet();
    res.status(results.resultCode || 200).set("Cache-Control", "private, max-age=5, s-maxage=5").jsonp(results);
  }
  catch(error) {
    if (error.resultCode && error.resultCode === 401)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.resultCode || 500).send(error.message);
  }
}

/**
 * Retrieve account record from data store.
 */
async function recall(req, res) {
  logger.verbose("/accounts/recall");
  let userid = req.params[ "userid" ] || req.query[ "userid" ] || req.user.userid;

  try {
    // retrieve user account
    let account = await accounts.recall(userid);
    if (!account)
      throw new StorageError(401, "invalid userid/password" );

    // update last login time
    account.lastLogin = new Date().toISOString();
    let results = await accounts.store(account);

    // return account record
    results.type = "map";
    results.data[req.user.userid] = account.packet();
    res.status(results.resultCode || 200).set("Cache-Control", "private, max-age=5, s-maxage=5").jsonp(results);
  }
  catch(error) {
    if (error.resultCode && error.resultCode === 401)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.resultCode || 500).send(error.message);
  }
}

/**
 * Create a new user account.
 * Fails if an account already exists with the provided userid.
 */
async function register(req, res) {
  logger.verbose("/accounts/register");

  try {
    let reqAccount = req.body.account || {};
    let admin = req.user.roles.includes(roles.Admin);

    if (!admin && (req.user.userid !== reqAccount.userid))
      throw new StorageError(401, "invalid userid/password");

    // try to recall account
    let account = await accounts.recall(reqAccount.userid);
    if (account)
      throw new StorageError(409, "account already exists");

    if (!admin && req.user.password !== reqAccount.password) {
      // both should be plain text and equal for new user request
      throw new StorageError(401, "invalid userid/password");
    }

    // store new user account
    let newAccount = new Account(reqAccount.userid);
    newAccount.update(reqAccount);
    newAccount.password = Account.hashPwd(reqAccount.password);
    newAccount.roles = (admin && reqAccount.roles) || [roles.Public, roles.User];
    newAccount.dateCreated = new Date().toISOString();
    newAccount.dateUpdated = new Date().toISOString();
    newAccount.lastLogin = new Date().toISOString();

    let results = await accounts.store(newAccount);

    // return user's record
    results.type = "map";
    results.data[newAccount.userid] = newAccount.packet();
    res.status(results.resultCode || 201).set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.resultCode && error.resultCode === 409)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.resultCode || 500).set('Content-Type', 'text/plain').send(error.message);
  }
}

/**
 * Update account record in ElasticSearch.  Inserts if it doesn't exist.
 */
async function store(req, res) {
  logger.verbose("/accounts/store");

  try {
    let reqAccount = req.body.account || {};
    let admin = req.user.roles.includes(roles.Admin);

    if (!admin && (req.user.userid !== reqAccount.userid))
      throw new StorageError(401, "invalid userid/password");

    // find the user's account
    let oldAccount = await accounts.recall(reqAccount.userid);
    if (!oldAccount)
      throw new StorageError(404, "account not found");

    if (!admin && req.user.password !== oldAccount.password)
      throw new StorageError(401, "invalid userid/password");

    let modAccount = new Account(reqAccount.userid);
    modAccount.copy(oldAccount);
    modAccount.update(reqAccount);
    if (reqAccount.password)
      modAccount.password = Account.hashPwd(reqAccount.password);
    if (admin && reqAccount.roles)
      modAccount.roles = reqAccount.roles;
    modAccount.dateUpdated = new Date().toISOString();

    // save the updated user account
    let results = await accounts.store(modAccount);

    // return user's record
    results.type = "map";
    results.data[modAccount.userid] = modAccount.packet();
    res.status(results.resultCode || 200).set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.resultCode && error.resultCode === 401)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.resultCode || 500).set('Content-Type', 'text/plain').send(error.message);
  }
}

/**
 * Disable user account
 */
async function dull(req, res) {
  logger.verbose("/accounts dull called");

  try {
    let user = req.body.account || req.body;
    let userid = req.params[ "userid" ] || req.query[ "userid" ] || user.userid || req.user.userid;
    let admin = req.user.roles.includes(roles.Admin);

    if (!admin && (req.user.userid !== userid))
      throw new StorageError(401, "invalid userid/password");

    // find the user's account
    let account = await accounts.recall(userid);
    if (!account)
      throw new StorageError(404, "account not found");

    if (!admin && (req.user.password !== account.password))
      throw new StorageError(401, "invalid userid/password");

    // delete user account
    let results = await accounts.dull(userid);

    //let results = new StorageResults(0);
    res.status(results.resultCode || 200).set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.resultCode && error.resultCode === 401)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.resultCode || 500).set('Content-Type', 'text/plain').send(error.message);
  }
}

/**
 * Log a user event.
 */
async function logEvent(req, res) {
  logger.verbose("/accounts/log");

  try {
    let event = req.body.event || req.body || {};
    let admin = req.user.roles.includes(roles.Admin);
    if (!admin && (req.user.userid !== event.userid))
      throw new StorageError(401, "invalid userid/password");

    // find the user's account
    let account = await accounts.recall(event.userid);
    if (!account)
      throw new StorageError(404, "account not found");

    // log event
    logger.info(JSON.stringify(event));

    // return "ok"
    let results = new StorageResults(0);
    res.status(results.resultCode || 200).set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.resultCode && error.resultCode === 401)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.resultCode || 500).set('Content-Type', 'text/plain').send(error.message);
  }
}
