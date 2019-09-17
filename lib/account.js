"use strict";
/**
 * api/account.js
 */

//var config = require("../config");
const express = require("express");
const crypto = require("crypto");
const authorize = require("./authorize");
const User = require('./user');
const roles = require("./roles");
const config = require("./config");
const logger = require("./logger");
const storage = require("@dicta.io/storage-junctions");

//const _index = config.realm + "_accounts";

/**
 * /account routes
 */
var router = express.Router();

// user requests
router.get("/login", authorize([roles.Public]), login);
router.post("/register", authorize([roles.Public]), register);
router.put("/update", authorize([roles.User]), update);
router.delete("/remove", authorize([roles.User]), remove);

// admin requests
//router.get("/accounts", getUserList);
//router.get("/lib/:userid", getUser);
//router.put("/lib/:userid", updateUser);
//router.post("/lib/:userid", createUser);
//router.delete("/lib/:userid", deleteUser);

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

  let userid = req.user.userid;
  let user = new User();

  var smt = config.accounts_smt;
  var junction = storage.create(smt);

  let pattern = {
    filter: {
      "userid": userid
    }
  };

  // retrieve user account
  //junction.retrieve(pattern)
  junction.recall({key: userid})
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

  if ( req.user.userid !== req.body.userid
    || req.user.password !== req.body.password
    || !req.body.password ) {
    res.status(401).jsonp({ error: "invalid userid/password" });
    return;
  }

  let userid = req.body.userid;
  let user = new User();

  var smt = config.accounts_smt;
  var junction = storage.create(smt);

  let pattern = {
    filter: {
      "userid": userid
    }
  };

  // check if account already exists
  //junction.retrieve(pattern)
  junction.recall({key: userid})
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
function update(req, res) {
  logger.info("action 'accounts.update' called.");

  if ( req.user.userid !== req.body.userid
    || !req.body.password ) {
    res.status(401).jsonp({ error: "invalid userid/password" });
    return;
  }

  let userid = req.body.userid;
  let user = new User();

  var smt = config.accounts_smt;
  var junction = storage.create(smt);

  let pattern = {
    filter: {
      "userid": userid
    }
  };

  // find the user's account
  //junction.retrieve(pattern)
  junction.recall({key: userid})
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
function remove(req, res) {
  logger.info("action 'accounts.remove' called.");

  let userid = req.user.userid;

  var smt = config.accounts_smt;
  var junction = storage.create(smt);

  let pattern = {
    filter: {
      "userid": userid
    }
  };

  // find the user's account
  //junction.retrieve(pattern)
  junction.recall({key: userid})
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
