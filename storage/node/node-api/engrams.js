/**
 * storage/node/node-api/engrams
*/
"use strict";

const express = require('express');
const authorize = require("../authorize");
const Roles = require("../roles");
const logger = require('../../utils/logger');
const { Storage } = require('@dictadata/storage-tracts');
const { Engram } = require('@dictadata/storage-tracts/types');
const { StorageError } = require('@dictadata/storage-junctions/types');

/**
 * Express routes
 */
var router = express.Router();

// Public role
router.get('/engrams', authorize([ Roles.Public ]), recall);
router.get('/engrams/:urn', authorize([ Roles.Public ]), recall);

// User role
router.post('/engrams', authorize([ Roles.User ]), retrieve);

// Coder role
router.put('/engrams', authorize([ Roles.Coder ]), store);

router.delete('/engrams', authorize([ Roles.Coder ]), dull);
router.delete('/engrams/:urn', authorize([ Roles.Coder ]), dull);


module.exports = router;

/**
 * store
 * @param {*} req
 * @param {*} res
 */
async function store(req, res) {
  logger.verbose('/engrams/store');

  var entry = req.body;

  try {
    let results;
    let engram;

    switch (entry.type) {
      case "engram":
        engram = new Engram(entry);
        results = await Storage.engrams.store(engram);
        break;
      case "alias":
        results = await Storage.engrams.store(entry);
        break;
      default:
        throw new StorageError(400, "invalid engrams type");
    }

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
  logger.verbose('/engrams/recall');

  var urn = req.params[ "urn" ] || req.query[ "urn" ];
  var realm = req.query[ "realm" ];
  var name = req.query[ "name" ];
  var resolve = req.query[ "resolve" ] || false;

  if ((!urn || urn[ 0 ] === "$") && !name)
    throw new StorageError(400, "invalid engrams name");

  try {
    let results;
    if (urn)
      results = await Storage.engrams.recall(urn, resolve);
    else
      results = await Storage.engrams.recall({ realm: realm, name: name }, resolve);

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
  logger.verbose('/engrams/dull');

  var urn = req.params[ "urn" ] || req.query[ "urn" ] || req.body?.urn;
  var realm = req.query[ "realm" ] || req.body?.realm;
  var name = req.query[ "name" ] || req.body?.name;

  if ((!urn || urn[ 0 ] === "$") && !name)
    throw new StorageError(400, "invalid engrams name");

  try {
    let results;
    if (urn)
      results = await Storage.engrams.dull(urn);
    else
      results = await Storage.engrams.dull({ realm: realm, name: name });

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
  logger.verbose('/engrams/retrieve');

  var pattern = req.body.pattern || req.body;

  try {
    let results = await Storage.engrams.retrieve(pattern);
    res.status(results.status || 200)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}
