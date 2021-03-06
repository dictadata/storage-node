"use strict";
/**
 * storage-node/account
 */

const storage = require("@dictadata/storage-junctions");
const { StorageResponse, StorageError } = require("@dictadata/storage-junctions").types;
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
// account requests
router.get("/login", authorize([roles.Public]), login);
router.get("/account", authorize([roles.Public]), login);

router.post("/register", authorize([roles.Public]), register);
router.post("/account", authorize([roles.Public]), register);

router.put("/account", authorize([roles.User, roles.Admin]), store);

router.delete("/account", authorize([roles.User, roles.Admin]), dull);
router.delete("/account/:userid", authorize([roles.User, roles.Admin]), dull);

router.post("/log", authorize([roles.Public]), logEvent);
module.exports = router;

/**
 * Retrieve account record from data store.
 */
async function login(req, res) {
  logger.verbose("/accounts/login");
  // no request body

  try {
    // retrieve user account
    let account = await accounts.recall(req.user.userid);
    if (!account)
      throw new StorageError(401, "invalid userid/password" );

    if (req.user.password !== account.password)
      throw new StorageError(401, "invalid userid/password");

    // update last login time
    account.lastLogin = new Date().toISOString();
    let results = await accounts.store(account);

    // return account record
    results.data[req.user.userid] = account.packet();
    res.set("Cache-Control", "private, max-age=5, s-maxage=5").jsonp(results);
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
    results.data[newAccount.userid] = newAccount.packet();
    res.status(201).set("Cache-Control", "no-store").jsonp(results);
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
    results.data[modAccount.userid] = modAccount.packet();
    res.set("Cache-Control", "no-store").jsonp(results);
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
    let reqAccount = req.body.account || req.body;
    let userid = reqAccount.userid || req.query["userid"] ||  req.params["userid"];
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

    //let results = new StorageResponse(0);
    res.set("Cache-Control", "no-store").jsonp(results);
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
    let event = req.body.event || {};
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
    let results = new StorageResponse(0);
    res.set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.resultCode && error.resultCode === 401)
      logger.warn(error.message);
    else
      logger.error(error);
    res.status(error.resultCode || 500).set('Content-Type', 'text/plain').send(error.message);
  }
}
