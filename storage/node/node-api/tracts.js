/**
 * storage/node/node-api/tracts
*/
"use strict";

const express = require('express');
const authorize = require("../authorize");
const Roles = require("../roles");
const logger = require('../../utils/logger');
const { Storage } = require('@dictadata/storage-tracts');
const { StorageError } = require('@dictadata/storage-junctions/types');

/**
 * Express routes
 */
var router = express.Router();

// Public role
router.get('/tracts', authorize([ Roles.Public, Roles.Coder ]), recall);
router.get('/tracts/:urn', authorize([ Roles.Public, Roles.Coder ]), recall);

// User role
router.post('/tracts', authorize([ Roles.User, Roles.Coder ]), retrieve);

// Coder role
router.put('/tracts', authorize([ Roles.Coder ]), store);

router.delete('/tracts', authorize([ Roles.Coder ]), dull);
router.delete('/tracts/:urn', authorize([ Roles.Coder ]), dull);


module.exports = router;

/**
 * store
 * @param {*} req
 * @param {*} res
 */
async function store(req, res) {
  logger.verbose('/tracts/store');

  var entry = req.body;

  try {
    let results;

    results = await Storage.tracts.store(entry);

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
  logger.verbose('/tracts/recall');

  var urn = req.params[ "urn" ] || req.query[ "urn" ];
  var domain = req.query[ "domain" ];
  var name = req.query[ "name" ];
  var resolve = req.query[ "resolve" ];

  if ((!urn || urn[ 0 ] === "$") && !name)
    throw new StorageError(400, "invalid Tracts name");

  try {
    let results;
    if (urn)
      results = await Storage.tracts.recall({ key: urn, resolve: resolve });
    else
      results = await Storage.tracts.recall({ domain: domain, name: name, resolve: resolve });

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
  logger.verbose('/tracts/dull');

  var urn = req.params[ "urn" ] || req.query[ "urn" ] || req.body?.urn;
  var domain = req.query[ "domain" ] || req.body?.domain;
  var name = req.query[ "name" ] || req.body?.name;

  if ((!urn || urn[ 0 ] === "$") && !name)
    throw new StorageError(400, "invalid Tracts name");

  try {
    let results;
    if (urn)
      results = await Storage.tracts.dull(urn);
    else
      results = await Storage.tracts.dull({ domain: domain, name: name });

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
  logger.verbose('/tracts/retrieve');

  var pattern = req.body.pattern || req.body;

  try {
    let results = await Storage.tracts.retrieve(pattern);
    res.status(results.status || 200)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}
