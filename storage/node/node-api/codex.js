/**
 * storage-node/storage.js
*/
"use strict";

const express = require('express');
const authorize = require("../authorize");
const Roles = require("../roles");
const logger = require('../../utils/logger');
const Storage = require('@dictadata/storage-junctions');
const { Engram, StorageError } = require('@dictadata/storage-junctions/types');

/**
 * Express routes
 */
var router = express.Router();

// Public role
router.get('/codex', authorize([ Roles.Public, Roles.Coder ]), recall);
router.get('/codex/:smt_urn', authorize([ Roles.Public, Roles.Coder ]), recall);

// User role
router.post('/codex', authorize([ Roles.User, Roles.Coder ]), retrieve);

// Coder role
router.put('/codex', authorize([ Roles.Coder ]), store);

router.delete('/codex', authorize([ Roles.Coder ]), dull);
router.delete('/codex/:smt_urn', authorize([ Roles.Coder ]), dull);


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

    res.status(results.resultCode || 200)
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

  var smt_urn = req.params[ "smt_urn" ] || req.query[ "smt_urn" ];
  var domain = req.query[ "domain" ];
  var name = req.query[ "name" ];
  var resolve = req.query[ "resolve" ];

  if ((!smt_urn || smt_urn[ 0 ] === "$") && !name)
    throw new StorageError(400, "invalid Codex name");

  try {
    let results;
    if (smt_urn)
      results = await Storage.codex.recall({ key: smt_urn, resolve: resolve });
    else
      results = await Storage.codex.recall({ domain: domain, name: name, resolve: resolve });

    res.status(results.resultCode || 200)
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

  var smt_urn = req.params[ "smt_urn" ] || req.query[ "smt_urn" ] || (req.body && req.body.smt_urn);
  var domain = req.query[ "domain" ] || (req.body && req.body.domain);
  var name = req.query[ "name" ] || (req.body && req.body.name);

  if ((!smt_urn || smt_urn[ 0 ] === "$") && !name)
    throw new StorageError(400, "invalid Codex name");

  try {
    let results;
    if (smt_urn)
      results = await Storage.codex.dull(smt_urn);
    else
      results = await Storage.codex.dull({ domain: domain, name: name });

    res.status(results.resultCode || 200)
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
    res.status(results.resultCode || 200)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}
