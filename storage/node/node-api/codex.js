/**
 * storage-node/storage.js
*/
"use strict";

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const config = require("../config.js");
const logger = require('../../utils/logger');
const storage = require('@dictadata/storage-junctions');
const { StorageResponse, StorageError } = require('@dictadata/storage-junctions').types;
const { typeOf } = require('@dictadata/storage-junctions').utils;

/**
 * storage routes
 */

var router = express.Router();

router.get('/smt/:SMT', authorize([roles.ETL, roles.Admin]), getSMT);

router.put('/smt/:SMT', authorize([roles.ETL, roles.Admin]), putSMT);
router.put('/smt', authorize([roles.ETL, roles.Admin]), putSMT);

router.delete('/smt', authorize([roles.ETL, roles.Admin]), dullSMT);
router.delete('/smt/:SMT', authorize([roles.ETL, roles.Admin]), dullSMT);

module.exports = router;


/**
 * getSMT
 * @param {*} req
 * @param {*} res
 */
async function getSMT(req, res) {
  logger.verbose('/storage/getSMT');

  var smtname = req.params['SMT'] || req.query['SMT'] || (req.body && req.body.SMT);
  if (!smtname || smtname[0] === "$" || !config.smt[smtname])
    throw new StorageError(400, "invalid SMT name");

  try {
    if (config.smt[smtname])
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(config.smt[smtname]);
    else
      res.sendStatus(404);
  }
  catch (err) {
    logger.error(err);
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}

/**
 * putSMT
 * @param {*} req
 * @param {*} res
 */
async function putSMT(req, res) {
  logger.verbose('/storage/putSMT');

  var smtname = req.params['SMT'] || req.query['SMT'] || (req.body && req.body.SMT);
  if (!smtname || smtname[0] === "$" || !config.smt[smtname])
    throw new StorageError(400, "invalid SMT name");

  var smt = req.body.smt || req.body;

  try {
    config.smt[smtname] = smt;
    res.status(201).set("Cache-Control", "no-store").jsonp({result: "ok"});
  }
  catch (err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}

/**
 * dullSMT
 * @param {*} req
 * @param {*} res
 */
async function dullSMT(req, res) {
  logger.verbose('/storage/dullSMT');

  var smtname = req.params['SMT'] || req.query['SMT'] || (req.body && req.body.SMT);
  if (!smtname || smtname[0] === "$" || !config.smt[smtname])
    throw new StorageError(400, "invalid SMT name");

  try {
    if (config.smt[smtname]) {
      delete config.smt.smtname;
      res.status(201).set("Cache-Control", "no-store").jsonp({ result: "ok" });
    }
    else
      res.sendStatus(404);
  }
  catch (err) {
    logger.error(err);
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}
