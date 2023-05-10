/**
 * storage/node/node-api/cortex
*/
"use strict";

const express = require('express');
const authorize = require("../authorize");
const Roles = require("../roles");
const logger = require('../../utils/logger');
const Storage = require('@dictadata/storage-junctions');
const { StorageError } = require('@dictadata/storage-junctions/types');

/**
 * Express routes
 */
var router = express.Router();

// Public role
router.get('/cortex', authorize([ Roles.Public, Roles.Coder ]), recall);
router.get('/cortex/:urn', authorize([ Roles.Public, Roles.Coder ]), recall);

// User role
router.post('/cortex', authorize([ Roles.User, Roles.Coder ]), retrieve);

// Coder role
router.put('/cortex', authorize([ Roles.Coder ]), store);

router.delete('/cortex', authorize([ Roles.Coder ]), dull);
router.delete('/cortex/:urn', authorize([ Roles.Coder ]), dull);


module.exports = router;

/**
 * store
 * @param {*} req
 * @param {*} res
 */
async function store(req, res) {
  logger.verbose('/cortex/store');

  var entry = req.body;

  try {
    let results;

    results = await Storage.cortex.store(entry);

    res.status(results.status || 200)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}

/**
 * recall
 * @param {*} req
 * @param {*} res
 */
async function recall(req, res) {
  logger.verbose('/cortex/recall');

  var urn = req.params[ "urn" ] || req.query[ "urn" ];
  var domain = req.query[ "domain" ];
  var name = req.query[ "name" ];
  var resolve = req.query[ "resolve" ];

  if ((!urn || urn[ 0 ] === "$") && !name)
    throw new StorageError(400, "invalid Cortex name");

  try {
    let results;
    if (urn)
      results = await Storage.cortex.recall({ key: urn, resolve: resolve });
    else
      results = await Storage.cortex.recall({ domain: domain, name: name, resolve: resolve });

    res.status(results.status || 200)
      .set("Cache-Control", "public, max-age=60, s-maxage=60")
      .jsonp(results);
  }
  catch (err) {
    logger.error(err.message);
    res.status(err.status || 500)
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

  var urn = req.params[ "urn" ] || req.query[ "urn" ] || req.body?.urn;
  var domain = req.query[ "domain" ] || req.body?.domain;
  var name = req.query[ "name" ] || req.body?.name;

  if ((!urn || urn[ 0 ] === "$") && !name)
    throw new StorageError(400, "invalid Cortex name");

  try {
    let results;
    if (urn)
      results = await Storage.cortex.dull(urn);
    else
      results = await Storage.cortex.dull({ domain: domain, name: name });

    res.status(results.status || 200)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    logger.error(err.message);
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
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
    let results = await Storage.cortex.retrieve(pattern);
    res.status(results.status || 200)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}
