/**
 * storage/node/node-api/accounts
 */
"use strict";

const { StorageResults, StorageError } = require("@dictadata/storage-junctions/types");
const express = require("express");
const accounts = require("../accounts");
const Account = require('../account');
const authorize = require("../authorize");
const Roles = require("../roles");
const logger = require("../../utils/logger");

/**
 * accounts routes
 */
var router = module.exports = exports = express.Router();

// account requests
router.get("/accounts", authorize([Roles.User]), recall);
router.get("/accounts/:userid", authorize([Roles.Admin]), recall);

router.put("/accounts", authorize([Roles.User]), store);
router.put("/accounts/:userid", authorize([Roles.Admin]), store);

router.delete("/accounts", authorize([Roles.User]), dull);
router.delete("/accounts/:userid", authorize([Roles.Admin]), dull);

router.post("/accounts", authorize([ Roles.Admin ]), retrieve);

/**
 * Update account record in data store. Inserts if it doesn't exist.
 */
async function store(req, res) {
  logger.verbose("/accounts/store");

  try {
    let reqAccount = req.body.account || {};
    let userid = req.params[ "userid" ] || req.query[ "userid" ] || reqAccount.userid || req.user.userid;
    let admin = req.user.roles.includes(Roles.Admin);

    if (!admin && (req.user.userid !== reqAccount.userid))
      throw new StorageError(401, "invalid userid/password");

    // find the user's account
    let results = await accounts.recall(reqAccount.userid);

    let oldAccount;
    if (results.status === 0)
      oldAccount = results.data[ reqAccount.userid ];
    else if (results.status === 404)
      oldAccount = { userid, password: req.user.password };
    else
      throw results;  // results should be a StorageError

    if (!admin && (req.user.password !== oldAccount.password))
      throw new StorageError(401, "invalid userid/password");

    let modAccount = new Account(oldAccount);
    modAccount.update(reqAccount);  // not userid, password, roles, state
    if (reqAccount.password)
      modAccount.password = Account.hashPwd(reqAccount.password);
    if (admin && reqAccount.roles)
      modAccount.roles = reqAccount.roles;
    modAccount.dateUpdated = new Date().toISOString();

    // save the updated user account
    let results2 = await accounts.store(modAccount);

    // return user's record
    results2.type = "map";
    results2.data[modAccount.userid] = modAccount.sanitize(); // remove sensitive fields like password
    res.status(results2.status || 200).set("Cache-Control", "no-store").jsonp(results2);
  }
  catch(error) {
    if (error.status && error.status === 401)
      logger.warn(error.message);
    else
      logger.error(error.message);
    res.status(error.status || 500).set('Content-Type', 'text/plain').send(error.message);
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
    let admin = req.user.roles.includes(Roles.Admin);

    if (!admin && (req.user.userid !== userid))
      throw new StorageError(401, "invalid userid/password");

    // find the user's account
    let results = await accounts.recall(userid);
    if (results.status !== 0)
      throw results;  // results should be a StorageError
    let account = results.data[ userid ];

    if (!admin && (req.user.password !== account.password))
      throw new StorageError(401, "invalid userid/password");

    // delete user account
    let results2 = await accounts.dull(userid);

    res.status(results2.status || 200).set("Cache-Control", "no-store").jsonp(results2);
  }
  catch(error) {
    if (error.status && error.status === 401)
      logger.warn(error.message);
    else
      logger.error(error.message);
    res.status(error.status || 500).set('Content-Type', 'text/plain').send(error.message);
  }
}

/**
 * Lookup account record in data store.
 */
async function recall(req, res) {
  logger.verbose("/accounts/recall");

  try {
    let userid = req.params[ "userid" ] || req.query[ "userid" ] || req.user.userid;
    let admin = req.user.roles.includes(Roles.Admin);

    if (!admin && (req.user.userid !== userid))
      throw new StorageError(401, "invalid userid/password");

    let results = await accounts.recall(userid);
    if (results.status !== 0)
      throw results;  // results should be a StorageError
    let account = new Account(results.data[ userid ]);

    if (!admin && (req.user.password !== account.password))
      throw new StorageError(401, "invalid userid/password");

    // return account record
    results.data[userid] = account.sanitize();  // remove sensitive fields like password
    res.status(results.status || 200).set("Cache-Control", "private, max-age=5, s-maxage=5").jsonp(results);
  }
  catch(error) {
    if (error.status && error.status === 401)
      logger.warn(error.message);
    else
      logger.error(error.message);
    res.status(error.status || 500).send(error.message);
  }
}

/**
 * Retrieve account records form data store.
 * @param {*} req
 * @param {*} res
 */
async function retrieve(req, res) {
  logger.verbose('/accounts/retrieve');

  var junction;
  try {
    let admin = req.user.roles.includes(Roles.Admin);
    if (!admin)
      throw new StorageError(401, "invalid userid/password");

    var pattern = Object.assign({}, req.query, (req.body.pattern || req.body));
    if (Object.keys(pattern).length === 0)
      throw new StorageError(400, "query pattern is invalid");

    // retrieve accounts
    let results = await accounts.retrieve(pattern);

    if (results.status === 0) {
      for (let [ userid, account ] of Object.entries(results.data)) {
        // remove sensitive fields like password
        results.data[ userid ] = new Account(account).sanitize();
      }
    }

    res.status(results.status || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(results);
  }
  catch (err) {
    logger.error(err.message);
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}
