/**
 * storage-node/storage.js
*/
"use strict";

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const logger = require('../../utils/logger');
const storage = require('@dictadata/storage-junctions');
const { Engram, StorageResponse, StorageError } = require('@dictadata/storage-junctions/types');

/**
 * Express routes
 */

var router = express.Router();

router.get('/codex/:SMT', authorize([ roles.Public ]), recallSMT);

router.put('/codex/:SMT', authorize([ roles.Coder ]), storeSMT);
router.put('/codex', authorize([ roles.Coder ]), storeSMT);

router.post('/codex', authorize([ roles.Coder ]), retrieveSMT);

router.delete('/codex/:SMT', authorize([ roles.Coder ]), dullSMT);
router.delete('/codex', authorize([ roles.Coder ]), dullSMT);

module.exports = router;

/**
 * recallSMT
 * @param {*} req
 * @param {*} res
 */
async function recallSMT(req, res) {
  logger.verbose('/storage/recallSMT');

  var smtname = req.params[ 'SMT' ] || req.query[ 'SMT' ] || (req.body && req.body.SMT);
  if (!smtname || smtname[ 0 ] === "$")
    throw new StorageError(400, "invalid SMT name");

  try {
    if (smtname) {
      let results = await storage.codex.recall(smtname);
      res.set("Cache-Control", "public, max-age=60, s-maxage=60")
        .jsonp(results);
    }
    else
      res.sendStatus(404);
  }
  catch (err) {
    logger.error(err);
    res.status(err.resultCode || 500)
      .set('Content-Type', 'text/plain')
      .send(err.message);
  }
}

/**
 * dullSMT
 * @param {*} req
 * @param {*} res
 */
async function dullSMT(req, res) {
  logger.verbose('/storage/dullSMT');

  var smtname = req.params[ 'SMT' ] || req.query[ 'SMT' ] || (req.body && req.body.SMT);
  if (!smtname || smtname[ 0 ] === "$")
    throw new StorageError(400, "invalid SMT name");

  try {
    if (smtname) {
      let results = storage.codex.dull(smtname);
      res.status(201)
        .set("Cache-Control", "no-store")
        .jsonp(results);
    }
    else
      res.sendStatus(404);
  }
  catch (err) {
    logger.error(err);
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}

/**
 * storeSMT
 * @param {*} req
 * @param {*} res
 */
async function storeSMT(req, res) {
  logger.verbose('/storage/storeSMT');

  var smtname = req.params[ 'SMT' ] || req.query[ 'SMT' ] | (req.body && req.body.SMT);
  if (!smtname || smtname[ 0 ] === "$")
    throw new StorageError(400, "invalid SMT name");

  var entry = req.body.codex || req.body;

  try {
    let engram = new Engram(entry.smt);
    engram.name = entry.name || smtname;
    if (entry.encoding)
      engram.encoding = entry.encoding;
    let results = storage.codex.store(engram.encoding);

    res.status(201)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}

/**
 * retrieveSMT
 * @param {*} req
 * @param {*} res
 */
async function retrieveSMT(req, res) {
  logger.verbose('/storage/retrieveSMT');

  var pattern = req.body.pattern || req.body;

  try {
    let results = storage.codex.retrieve(pattern);
    res.status(201)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}
