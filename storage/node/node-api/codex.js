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

router.get('/codex/:SMT', authorize([ roles.Public ]), recall);

router.put('/codex/:SMT', authorize([ roles.Coder ]), store);
router.put('/codex', authorize([ roles.Coder ]), store);

router.post('/codex', authorize([ roles.Coder ]), retrieve);

router.delete('/codex/:SMT', authorize([ roles.Coder ]), dull);
router.delete('/codex', authorize([ roles.Coder ]), dull);

module.exports = router;

/**
 * recall
 * @param {*} req
 * @param {*} res
 */
async function recall(req, res) {
  logger.verbose('/codex/recall');

  var smtname = req.params[ 'SMT' ] || req.query[ 'SMT' ] || (req.body && req.body.SMT);
  if (!smtname || smtname[ 0 ] === "$")
    throw new StorageError(400, "invalid SMT name");

  try {
    if (smtname) {
      let results = await storage.codex.recall(smtname);
      res.status(results.resultCode === 0 ? 200 : results.resultCode)
        .set("Cache-Control", "public, max-age=60, s-maxage=60")
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
 * dull
 * @param {*} req
 * @param {*} res
 */
async function dull(req, res) {
  logger.verbose('/codex/dull');

  var smtname = req.params[ 'SMT' ] || req.query[ 'SMT' ] || (req.body && req.body.SMT);
  if (!smtname || smtname[ 0 ] === "$")
    throw new StorageError(400, "invalid SMT name");

  try {
    if (smtname) {
      let results = await storage.codex.dull(smtname);
      res.status(results.resultCode === 0 ? 200 : results.resultCode)
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
 * store
 * @param {*} req
 * @param {*} res
 */
async function store(req, res) {
  logger.verbose('/codex/store');

  var smtname = req.params[ 'SMT' ] || req.query[ 'SMT' ] | (req.body && req.body.SMT);
  if (!smtname || smtname[ 0 ] === "$")
    throw new StorageError(400, "invalid SMT name");

  var entry = req.body.codex || req.body;

  try {
    let engram = new Engram(entry.smt);
    engram.name = smtname || entry.name;
    if (entry.encoding)
      engram.encoding = entry.encoding;
    let results = await storage.codex.store(engram.encoding);

    res.status(results.resultCode === 0 ? 200 : results.resultCode)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}

/**
 * retrieve
 * @param {*} req
 * @param {*} res
 */
async function retrieve(req, res) {
  logger.verbose('/codex/retrieve');

  var pattern = req.body.pattern || req.body;

  try {
    let results = await storage.codex.retrieve(pattern);
    res.status(results.resultCode === 0 ? 200 : results.resultCode)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}
