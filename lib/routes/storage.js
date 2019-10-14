"use strict";
/**
 * storage-node/storage.js
*/

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const logger = require('../logger');
const storage = require('@dicta-io/storage-junctions');

/**
 * storage routes
 */

var router = express.Router();
router.get('/encoding', authorize([roles.User, roles.Admin]), getEncoding);
router.get('/encoding/:SMT', authorize([roles.User, roles.Admin]), getEncoding);
router.put('/encoding', authorize([roles.User, roles.Admin]), putEncoding);
router.put('/encoding/:SMT', authorize([roles.User, roles.Admin]), putEncoding);

router.put('/store', authorize([roles.User, roles.Admin]), store);
router.put('/store/:SMT', authorize([roles.User, roles.Admin]), store);
router.get('/recall', authorize([roles.User, roles.Admin]), recall);
router.get('/recall/:SMT', authorize([roles.User, roles.Admin]), recall);
router.post('/retrieve', authorize([roles.User, roles.Admin]), retrieve);
router.post('/retrieve/:SMT', authorize([roles.User, roles.Admin]), retrieve);
router.delete('/dull', authorize([roles.User, roles.Admin]), dull);
router.delete('/dull/:SMT', authorize([roles.User, roles.Admin]), dull);
module.exports = router;

/**
 * getEncoding
 * @param {*} req
 * @param {*} res
 */
async function getEncoding (req, res) {
  logger.verbose('/storage/getEncoding');

  var smt = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  var junction = storage.activate(smt);

  try {
    let encoding = await junction.getEncoding();
    logger.debug(encoding);
    if (typeof encoding === 'object') {
      encoding.result = "ok";
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(encoding);
    }
    else
      res.sendStatus(404);
  }
  catch(err) {
    logger.error(err.message);
    res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
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
  logger.verbose('/storage/putEncoding');

  var smt = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  var newEncoding = req.body.encoding || req.body;
  var junction = storage.activate(smt);

  try {
    let encoding = await junction.putEncoding(newEncoding);
    if (typeof encoding === 'object') {
      encoding.result = "ok";
      res.status(201).set("Cache-Control", "no-store").jsonp(encoding);
    }
    else
      res.status(409).send(encoding);
  }
  catch(err) {
    res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
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

  var smt = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  var constructs = [];
  if (Array.isArray(req.body.data))
    constructs = req.body.data;
  else if (typeof req.body.data === "object")
    constructs.push(req.body.data);
  var junction = storage.activate(smt);

  try {
    let response = {result: "ok", results: []};
    for (let construct of constructs) {
      let results = await junction.store(construct);
      if (results.result === 'ok')
        response.results.push(results);
      else {
        res.status(400).jsonp(results);
        break;
      }
    }
    res.set("Cache-Control", "no-store").jsonp(response);
  }
  catch(err) {
    res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
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

  var smt = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  var match = req.body.match || {};
  var junction = storage.activate(smt);

  try {
    let results = await junction.recall(match);
    if (results.result === 'ok')
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(results);
    else if (results.result === 'not found')
      res.status(404).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch(err) {
    res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
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

  var smt = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  let pattern = req.body.pattern || {};
  var junction = storage.activate(smt);

  try {
    let results = await junction.retrieve(pattern);
    if (results.result === 'ok')
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(results);
    else if (results.result === 'not found')
      res.status(404).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch(err) {
    logger.error(err.message);
    res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
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

  var smt = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  var match = req.body.match || {};
  var junction = storage.activate(smt);

  try {
    let results = await junction.dull(match);
    if (results.result === 'ok')
      res.set("Cache-Control", "no-store").jsonp(results);
    else if (results.result === 'not found')
      res.status(404).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch (err) {
    res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
  }
  finally {
    junction.relax();
  }
}
