"use strict";
/**
 * storage-node/storage.js
*/

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const config = require('../config');
const logger = require('../logger');
const storage = require('@dicta-io/storage-junctions');

/**
 * storage routes
 */

var router = express.Router();
router.get('/encoding/:SMT', authorize([roles.User, roles.Admin]), getEncoding);
router.put('/encoding/:SMT', authorize([roles.User, roles.Admin]), putEncoding);

router.put('/store/:SMT', authorize([roles.User, roles.Admin]), store);
router.get('/recall/:SMT', authorize([roles.User, roles.Admin]), recall);
router.post('/retrieve/:SMT', authorize([roles.User, roles.Admin]), retrieve);
router.delete('/dull/:SMT', authorize([roles.User, roles.Admin]), dull);
module.exports = router;

/**
 * getEncoding
 * @param {*} req
 * @param {*} res
 */
async function getEncoding (req, res) {
  logger.verbose('/storage/encoding');

  var smt = req.params['SMT'];
  var junction = storage.activate(smt);

  try {
    let encoding = await junction.getEncoding();
    logger.debug(encoding);
    res.jsonp(encoding);
  }
  catch(err) {
    logger.error(err.message);
    res.status(err.statusCode || 500).jsonp(err.message);
  }
  finally {
    junction.relax();
  }
}

/**
 * putEncoding
 * @param {*} req
 * @param {*} res
 */
async function putEncoding (req, res) {
  logger.verbose('/storage/encoding');

  var smt = req.params['SMT'];
  var newEncoding = req.body.encoding || req.body;
  var junction = storage.activate(smt);

  try {
    let encoding = await junction.putEncoding(newEncoding);
    res.jsonp(encoding);
  }
  catch(err) {
    res.status(err.statusCode || 500).jsonp(err.message);
  }
  finally {
    junction.relax();
  }
}

/**
 * store
 * @param {*} req
 * @param {*} res
 */
async function store (req, res) {
  logger.verbose('/storage/store');

  var smt = req.params['SMT'];
  var construct = req.body.construct || req.body;
  var junction = storage.activate(smt);

  try {
    let results = await junction.store(construct);
    if (results.result === 'ok')
      res.status(201).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch(err) {
    res.status(err.statusCode || 500).jsonp(err.message);
  }
  finally {
    junction.relax();
  }
}

/**
 * recall
 * @param {*} req
 * @param {*} res
 */
async function recall (req, res) {
  logger.verbose('/storage/recall');

  var smt = req.params['SMT'];
  var keys = req.body || {};
  var junction = storage.activate(smt);

  try {
    let results = await junction.recall(keys);
    if (results.result === 'ok')
      res.status(201).jsonp(results);
    else if (results.result === 'not found')
      res.status(404).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch(err) {
    res.status(err.statusCode || 500).jsonp(err.message);
  }
  finally {
    junction.relax();
  }
}

/**
 * retreive
 * @param {*} req
 * @param {*} res
 */
async function retrieve (req, res) {
  logger.verbose('/storage/retrieve');

  var smt = req.params['SMT'];
  let pattern = req.body.pattern || req.body;
  var junction = storage.activate(smt);

  try {
    let results = await junction.retrieve(pattern);
    if (results.result === 'ok')
      res.status(201).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch(err) {
    logger.error(err.message);
    res.status(err.statusCode || 500).jsonp(err.message);
  }
  finally {
    junction.relax();
  }
}

/**
 * dull
 * @param {*} req
 * @param {*} res
 */
async function dull(req, res) {
  logger.verbose('/storage/dull');

  var smt = req.params['SMT'];
  var keys = req.body || {};
  var junction = storage.activate(smt);

  try {
    let results = await junction.dull(keys);
    if (results.result === 'ok')
      res.status(201).jsonp(results);
    else if (results.result === 'not found')
      res.status(404).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch (err) {
    res.status(err.statusCode || 500).jsonp(err.message);
  }
  finally {
    junction.relax();
  }
}

