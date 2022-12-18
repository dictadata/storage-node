/**
 * storage/node/node-api/log
 */
"use strict";

const { StorageResults, StorageError } = require("@dictadata/storage-junctions/types");
const express = require("express");
const accounts = require("../accounts");
const authorize = require("../authorize");
const roles = require("../roles");
const logger = require("../../utils/logger");

/**
 * account routes
 */
var router = module.exports = exports = express.Router();

router.post("/log", authorize([ roles.User ]), logEvent); // /log is probably not used

/**
 * Log a user event.
 */
async function logEvent(req, res) {
  logger.verbose("/accounts/log");

  try {
    let event = req.body.event || req.body || {};
    let superman = req.user.roles.includes(roles.Super);
    if (!superman && (req.user.userid !== event.userid))
      throw new StorageError(401, "invalid userid/password");

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
