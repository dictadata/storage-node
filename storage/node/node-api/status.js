"use strict";
/**
 * storage-node/status
 */

const express = require('express');
const authorize = require('../authorize');
const roles = require('../roles');
const config = require('../config');
const storage = require('@dictadata/storage-junctions');
const { StorageResults, StorageError } = require("@dictadata/storage-junctions").types;
const { typeOf } = require('@dictadata/storage-junctions').utils;
const logger = require('../../utils/logger');

/**
 * status routes
 */
var router = express.Router();
router.get('/status', authorize([roles.Public, roles.Monitor]), status);
router.get('/status/:SMT', authorize([roles.User, roles.Monitor, roles.Admin]), smt_status);
module.exports = router;

/**
 *
 * @param {*} req
 * @param {*} res
 */
function status(req, res) {
  logger.debug('/node-api/status');

  var results = new StorageResults(0);
  results.add(config.name, "name");
  results.add(config.version, "vesion");
  results.add(new Date().toISOString(), "time");
  //info.userid = ' + request.user.userid + '/' + request.user.password;

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.write(JSON.stringify(results));
  res.end();
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
    let smtname = req.params['SMT'] || req.query["SMT"];
    if (!smtname || !config.smt[smtname]) // || smtname[0] === "$")
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    let results = await junction.list();

    res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(results);
  }
  catch(err) {
    logger.error(err);
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}
