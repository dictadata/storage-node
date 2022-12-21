"use strict";
/**
 * storage-node/status
 */

const express = require('express');
const authorize = require('../authorize');
const Roles = require('../roles');
const config = require('../config');
const storage = require('@dictadata/storage-junctions');
const { StorageResults, StorageError } = require("@dictadata/storage-junctions/types");
const { typeOf } = require('@dictadata/storage-junctions/utils');
const logger = require('../../utils/logger');

/**
 * status routes
 */
var router = express.Router();
router.get('/status', authorize([ Roles.Public, Roles.Monitor ]), status);
router.get('/status/:SMT', authorize([ Roles.User, Roles.Monitor ]), smt_status);
module.exports = router;

/**
 *
 * @param {*} req
 * @param {*} res
 */
function status(req, res) {
  logger.debug('/node-api/status');

  var results = new StorageResults("construct");
  results.add({
    "name": config.name,
    "version": config.version,
    "time": new Date().toISOString()
  });
  //info.userid = ' + request.user.userid + '/' + request.user.password;

  res.status(200).jsonp(results);
}

/**
 *
 * @param {*} req
 * @param {*} res
 */
async function smt_status(req, res) {
  logger.debug('/node-api/smt_status');

  var junction;
  try {
    let smtname = req.params[ 'SMT' ] || req.query[ "SMT" ];
    if (!smtname)
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(smtname);

    let results = await junction.list();

    res.status(results.resultCode || 200).set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(results);
  }
  catch (err) {
    logger.error(err);
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}
