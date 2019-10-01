"use strict";
/**
 * node/storage.js
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
  logger.info('GET /storage/encoding');

  var smt = req.params['SMT'];
  var junction = storage.activate(smt);

  try {
    let encoding = await junction.getEncoding();
    //console.log(encoding);
    res.jsonp(encoding);
  }
  catch(err) {
    console.log(err);
    logger.error(err);
    res.jsonp(err);
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
  logger.info('PUT /storage/encoding');

  var smt = req.params['SMT'];
  var encoding = req.body;
  var junction = storage.activate(smt);

  try {
    let encoding = await junction.putEncoding(encoding);
    res.jsonp(encoding);
  }
  catch(err) {
    res.jsonp(err);
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
  logger.info('PUT /storage/store');

  var smt = req.params['SMT'];
  var construct = req.body;
  var junction = storage.activate(smt);

  try {
    let results = await junction.store(construct);
    if (results.result === 'ok')
      res.status(201).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch(err) {
    res.jsonp(err);
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
  logger.info('POST /storage/recall');

  var smt = req.params['SMT'];
  var junction = storage.activate(smt);

  try {
    let results = await junction.recall();
    if (results.result === 'ok')
      res.status(201).jsonp(results);
    else if (results.result === 'not found')
      res.status(404).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch(err) {
    res.jsonp(err);
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
  logger.info('POST /storage/retrieve');

  var smt = req.params['SMT'];
  let pattern = req.body.pattern;
  var junction = storage.activate(smt);

  try {
    let results = await junction.retrieve(pattern);
    if (results.result === 'ok')
      res.status(201).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch(err) {
    console.log(err);
    logger.error(err);
    res.jsonp(err);
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
  logger.info('POST /storage/dull');

  var smt = req.params['SMT'];
  var junction = storage.activate(smt);

  try {
    let results = await junction.dull();
    if (results.result === 'ok')
      res.status(201).jsonp(results);
    else if (results.result === 'not found')
      res.status(404).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch (err) {
    res.jsonp(err);
  }
  finally {
    junction.relax();
  }
}

