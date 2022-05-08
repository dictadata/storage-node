/**
 * storage-node/storage.js
*/
"use strict";

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const logger = require('../../utils/logger');
const storage = require('@dictadata/storage-junctions');
const { Engram, StorageError } = require('@dictadata/storage-junctions/types');

/**
 * Express routes
 */

var router = express.Router();

router.get('/codex/:name', authorize([ roles.Coder, roles.Public ]), recall);

router.put('/codex/:name', authorize([ roles.Coder ]), store);
router.put('/codex', authorize([ roles.Coder ]), store);

router.post('/codex', authorize([ roles.Coder, roles.User ]), retrieve);

router.delete('/codex/:name', authorize([ roles.Coder ]), dull);
router.delete('/codex', authorize([ roles.Coder ]), dull);

module.exports = router;

/**
 * recall
 * @param {*} req
 * @param {*} res
 */
async function recall(req, res) {
  logger.verbose('/codex/recall');

  var name = req.params[ "name" ] || req.query[ "name" ] || (req.body && req.body.name);
  if (!name || name[ 0 ] === "$")
    throw new StorageError(400, "invalid Codex name");

  try {
    if (name) {
      let results = await storage.codex.recall(name);
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

  var name = req.params[ "name" ] || req.query[ "name" ] || (req.body && req.body.name);
  if (!name || name[ 0 ] === "$")
    throw new StorageError(400, "invalid Codex name");

  try {
    if (name) {
      let results = await storage.codex.dull(name);
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

  var name = req.params[ "name" ] || req.query[ "name" ] | (req.body && req.body.name);
  if (!name || name[ 0 ] === "$")
    throw new StorageError(400, "invalid Codex name");

  var entry = req.body.codex || req.body;

  try {
    let engram;
    if (entry.type === "engram") {
      engram = new Engram(entry.smt);
      engram.name = name || entry.name;
      if (entry.encoding)
        engram.encoding = entry.encoding;
    }
    else
      engram = entry;

    let results = await storage.codex.store(engram);

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
