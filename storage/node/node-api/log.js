/**
 * storage/node/node-api/log
 */
"use strict";

const { StorageResults, StorageError } = require("@dictadata/storage-junctions/types");
const express = require("express");
const authorize = require("../authorize");
const Roles = require("../roles");
const logger = require("../../utils/logger");

/**
 * account routes
 */
var router = module.exports = exports = express.Router();

router.post("/log", authorize([ Roles.User ]), logEvent);

/**
 * Log a user event.
 */
async function logEvent(req, res) {
  logger.verbose("/node/log");

  try {
    let superman = req.user.roles.includes(Roles.Super);
    if (!superman && (req.user.userid !== event.userid))
      throw new StorageError(401, "invalid userid/password");

    let event = req.body.event || req.body || {};
    // TBD should do some validation

    // log event
    logger.info(JSON.stringify(event));

    // return "ok"
    let results = new StorageResults(0);
    res.status(results.status || 200).set("Cache-Control", "no-store").jsonp(results);
  }
  catch(error) {
    if (error.status && error.status === 401)
      logger.warn(error.message);
    else
      logger.error(error.message);
    res.status(error.status || 500).set('Content-Type', 'text/plain').send(error.message);
  }
}
