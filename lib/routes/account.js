"use strict";
/**
 * node/account
 */

const express = require("express");
const authorize = require("../authorize");
const roles = require("../roles");
const config = require("../config");
const logger = require("../logger");
const User = require('../user');
const crypto = require("crypto");
const storage = require("@dicta-io/storage-junctions");

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
 * Retrieve user record from data store.
 */
async function login(req, res) {
  //logger.info("action 'accounts.login' called.");
  // no request body

  let userid = req.user.userid;
  let user = new User();

  var smt = config.accounts_smt;
  var junction = storage.activate(smt);

  // retrieve user account
  junction.recall({userid: userid})
  .then(userinfo => {
    if (userinfo === null) {
      // no user record found
      throw( { statusCode: 401, message: "invalid userid/password" });
    }

    // found user record, check password
    user.copy(userinfo);
    if (user.password !== req.user.password) {
      throw( { statusCode: 401, message: "invalid userid/password" });
    }

    // update last login time
    user.lastLogin = new Date().toISOString();
    return junction.store(user,{key: userid});
  })
  .then(_result => {
    // send user info
    res.set("Cache-Control", "private, max-age=5");
    res.jsonp(user.package());
  })
  .catch(error => {
    logger.error(error);
    res.status(error.statusCode).jsonp(error.message);
  });
}

/**
 * Create a new user record in ElasticSearch.
 * Fails if an account already exists with the provided email address.
 */
function register(req, res) {
  logger.info("action 'accounts.register' called.");

  if ((req.body.userid !== req.user.userid || req.body.password !== req.user.password)
    && !req.user.roles.includes(roles.Admin)) {
    res.status(401).jsonp({ error: "invalid userid/password" });
    return;
  }

  let userid = req.body.userid;
  let user = new User();

  var smt = config.accounts_smt;
  var junction = storage.activate(smt);

  // check if account already exists
  junction.recall({userid: userid})
  .then(userinfo => {
    if (userinfo > null)
      throw( { statusCode: 409, message: "account already exists" });

    // index new user account
    user.update(req.body);
    user.password = hashPwd(req.body.password);
    user.roles = req.body.roles || [roles.Public, roles.User];
    user.dateCreated = new Date().toISOString();
    user.dateUpdated = new Date().toISOString();
    user.lastLogin = new Date().toISOString();
    // TODO copy other user profile info from req.body

    return junction.store(user,{key: userid});
  })
  .then(_results => {
    res.set("Cache-Control", "private, max-age=5");
    res.status(201).jsonp(user.package());  // return user's record
  })
  .catch(error => {
    logger.error(error);
    res.status(error.statusCode).jsonp(error.message);
  });
}

/**
 * Update user record in ElasticSearch.  Inserts if it doesn't exist.
 */
function store(req, res) {
  logger.info("action 'accounts.store' called.");

  if ((req.body.userid !== req.user.userid || !req.body.password)
    && !req.user.roles.includes(roles.Admin)) {
    res.status(401).jsonp({ error: "invalid userid/password" });
    return;
  }

  let userid = req.body.userid;
  let user = new User();

  var smt = config.accounts_smt;
  var junction = storage.activate(smt);

  // find the user's account
  junction.recall({userid: userid})
  .then(userinfo => {
    if (userinfo === null)
      throw( { statusCode: 401, message: "invalid userid/password" });

    user.copy(userinfo);
    user.update(req.body);
    user.password = hashPwd(req.body.password);
    user.dateUpdated = new Date().toISOString();

    // save the updated user account
    return junction.store(user,{key: userid});
  })
    .then(_results => {
      res.set("Cache-Control", "private, max-age=5");
      res.status(200).jsonp(user.package());  // return user's record
    })
    .catch(error => {
      logger.error(error);
      res.status(error.statusCode).jsonp(error.message);
    });
}

/**
 * Disable user account.
 */
function dull(req, res) {
  logger.info("action 'accounts.dull' called.");

  if ((req.body.userid !== req.user.userid || req.body.password !== req.user.password)
    && !req.user.roles.includes(roles.Admin)) {
    res.status(401).jsonp({ error: "invalid userid/password" });
    return;
  }

  let userid = req.body.userid;

  var smt = config.accounts_smt;
  var junction = storage.activate(smt);

  // find the user's account
  junction.recall({userid: userid})
  .then(userinfo => {
    if (userinfo === null)
      throw( { statusCode: 401, message: "invalid userid/password" });

    // check password
    if ( userinfo.password != req.user.password )
      throw( { statusCode: 401, message: "invalid userid/password" });

    // delete user account
    return junction.dull({key: userid});
  })
  .then(results => {
    res.status(200).jsonp({ status: results });
  })
  .catch(error => {
    logger.error(error);
    res.status(error.statusCode).jsonp(error.message);
  });
}
