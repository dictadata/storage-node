/**
 * storage-node/storage.js
*/
"use strict";

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const logger = require('../../utils/logger');
const Storage = require('@dictadata/storage-junctions');
const { Engram, StorageError } = require('@dictadata/storage-junctions/types');

/**
 * Express routes
 */
var router = express.Router();

router.put('/codex', authorize([ roles.Coder ]), store);

router.get('/codex/:smt_id', authorize([ roles.Coder, roles.Public ]), recall);
router.get('/codex/:domain/:name', authorize([ roles.Coder, roles.Public ]), recall);
router.get('/codex', authorize([ roles.Coder, roles.Public ]), recall);

router.delete('/codex/:smt_id', authorize([ roles.Coder ]), dull);
router.delete('/codex/:domain/:name', authorize([ roles.Coder ]), dull);
router.delete('/codex', authorize([ roles.Coder ]), dull);

router.post('/codex', authorize([ roles.Coder, roles.User ]), retrieve);

module.exports = router;

/**
 * store
 * @param {*} req
 * @param {*} res
 */
async function store(req, res) {
  logger.verbose('/codex/store');

  var entry = req.body.codex || req.body;

  try {
    let engram;
    switch (entry.type) {
      case "engram":
        engram = new Engram(entry);
        break;
      case "alias":
      case "tract":
        // need to do some type validation like Engram above
        engram = entry;
        break;
      default:
        throw new StorageError(400, "invalid codex type");
    }

    let results = await Storage.codex.store(engram);

    res.status(results.resultCode === 0 ? 200 : results.resultCode)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}

/**
 * recall
 * @param {*} req
 * @param {*} res
 */
async function recall(req, res) {
  logger.verbose('/codex/recall');

  var smt_id = req.params[ "smt_id" ] || req.query[ "smt_id" ];
  var domain = req.params[ "domain" ] || req.query[ "domain" ];
  var name = req.params[ "name" ] || req.query[ "name" ];
  var resolve = req.query[ "resolve" ];

  if ((!smt_id || smt_id[ 0 ] === "$") && !name)
    throw new StorageError(400, "invalid Codex name");

  try {
    let results;
    if (smt_id)
      results = await Storage.codex.recall({ key: smt_id, resolve: resolve });
    else
      results = await Storage.codex.recall({ match: { domain: domain, name: name }, resolve: resolve });

    res.status(results.resultCode === 0 ? 200 : results.resultCode)
      .set("Cache-Control", "public, max-age=60, s-maxage=60")
      .jsonp(results);
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

  var smt_id = req.params[ "smt_id" ] || req.query[ "smt_id" ] || (req.body && req.body.smt_id);
  var domain = req.params[ "domain" ] || req.query[ "domain" ] || (req.body && req.body.domain);
  var name = req.params[ "name" ] || req.query[ "name" ] || (req.body && req.body.name);

  if ((!smt_id || smt_id[ 0 ] === "$") && !name)
    throw new StorageError(400, "invalid Codex name");

  try {
    let results;
    if (smt_id)
      results = await Storage.codex.dull(smt_id);
    else
      results = await Storage.codex.dull({ domain: domain, name: name });

    res.status(results.resultCode === 0 ? 200 : results.resultCode)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    logger.error(err);
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
    let results = await Storage.codex.retrieve(pattern);
    res.status(results.resultCode === 0 ? 200 : results.resultCode)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}
