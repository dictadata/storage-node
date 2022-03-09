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

router.get('/cortex/:name', authorize([ roles.Public ]), recall);

router.put('/cortex/:name', authorize([ roles.Coder ]), store);
router.put('/cortex', authorize([ roles.Coder ]), store);

router.post('/cortex', authorize([ roles.Coder ]), retrieve);

router.delete('/cortex/:name', authorize([ roles.Coder ]), dull);
router.delete('/cortex', authorize([ roles.Coder ]), dull);

module.exports = router;

/**
 * recall
 * @param {*} req
 * @param {*} res
 */
async function recall(req, res) {
  logger.verbose('/cortex/recall');

  var name = req.params[ "name" ] || req.query[ "name" ] || (req.body && req.body.name);
  if (!name || name[ 0 ] === "$")
    throw new StorageError(400, "invalid Cortex name");

  try {
    if (name) {
      let results = await storage.cortex.recall(name);
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
  logger.verbose('/cortex/dull');

  var name = req.params[ "name" ] || req.query[ "name" ] || (req.body && req.body.name);
  if (!name || name[ 0 ] === "$")
    throw new StorageError(400, "invalid Cortex name");

  try {
    if (name) {
      let results = await storage.cortex.dull(name);
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
  logger.verbose('/cortex/store');

  var name = req.params[ "name" ] || req.query[ "name" ] | (req.body && req.body.name);
  if (!name || name[ 0 ] === "$")
    throw new StorageError(400, "invalid Cortex name");

  var entry = req.body.cortex || req.body;

  try {
    let engram = new Engram(entry.smt);
    engram.name = name || entry.name;
    if (entry.encoding)
      engram.encoding = entry.encoding;
    let results = await storage.cortex.store(engram.encoding);

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
  logger.verbose('/cortex/retrieve');

  var pattern = req.body.pattern || req.body;

  try {
    let results = await storage.cortex.retrieve(pattern);
    res.status(results.resultCode === 0 ? 200 : results.resultCode)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}
