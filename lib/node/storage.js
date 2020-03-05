/**
 * storage-node/storage.js
*/
"use strict";

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const config = require("../config.js");
const logger = require('../logger');
const storage = require('@dictadata/storage-junctions');
const StorageResults = storage.StorageResults;

/**
 * storage routes
 */

var router = express.Router();
router.get('/encoding', authorize([roles.ETL, roles.Admin]), getEncoding);
router.get('/encoding/:SMT', authorize([roles.ETL, roles.Admin]), getEncoding);
router.put('/encoding', authorize([roles.ETL, roles.Admin]), putEncoding);
router.put('/encoding/:SMT', authorize([roles.ETL, roles.Admin]), putEncoding);

router.put('/store', authorize([roles.User, roles.Admin]), store);
router.put('/store/:SMT', authorize([roles.User, roles.Admin]), store);

router.get('/recall', authorize([roles.User, roles.Admin]), recall);
router.get('/recall/:SMT', authorize([roles.User, roles.Admin]), recall);

router.post('/retrieve', authorize([roles.User, roles.Admin]), retrieve);
router.post('/retrieve/:SMT', authorize([roles.User, roles.Admin]), retrieve);

router.delete('/dull', authorize([roles.User, roles.Admin]), dull);
router.delete('/dull/:SMT', authorize([roles.User, roles.Admin]), dull);

router.get('/smt', authorize([roles.ETL, roles.Admin]), getSMT);
router.get('/smt/:SMT', authorize([roles.ETL, roles.Admin]), getSMT);
router.put('/smt', authorize([roles.ETL, roles.Admin]), putSMT);
router.put('/smt/:SMT', authorize([roles.ETL, roles.Admin]), putSMT);
router.delete('/smt', authorize([roles.ETL, roles.Admin]), dullSMT);
router.delete('/smt/:SMT', authorize([roles.ETL, roles.Admin]), dullSMT);
module.exports = router;


/**
 * getEncoding
 * @param {*} req
 * @param {*} res
 */
async function getEncoding (req, res) {
  logger.verbose('/storage/getEncoding');

  var smtname = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  if (!smtname || smtname[0] === "$") 
    throw new Error("invalid SMT name", { statusCode: 400 });
  var junction = storage.activate(config.smt[smtname]);

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

  var smtname = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  if (!smtname || smtname[0] === "$") throw new Error("invalid SMT name", { statusCode: 400 });
  var junction = storage.activate(config.smt[smtname]);

  var newEncoding = req.body.encoding || req.body.fields || req.body;

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

  var smtname = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  if (!smtname || smtname[0] === "$") throw new Error("invalid SMT name", { statusCode: 400 });
  var junction = storage.activate(config.smt[smtname]);

  var storageResults = new StorageResults("ok");
  
  try {
    if (Array.isArray(req.body.data)) {
      for (let construct of req.body.data) {
        let results = await junction.store(construct);
        storageResults.add(results.result);
        if (results.result !== 'ok')
          storageResults.result = results.result;
      }
    }
    else {
      for (let [key, construct] of Object.entries(req.body.data)) {
        let results = await junction.store(construct, {key: key});
        storageResults.add(results.result, key);
        if (results.result !== 'ok')
          storageResults.result = results.result;
      }
    }

    res.set("Cache-Control", "no-store").jsonp(storageResults);
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

  var smtname = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  if (!smtname || smtname[0] === "$") throw new Error("invalid SMT name", { statusCode: 400 });
  var junction = storage.activate(config.smt[smtname]);

  var pattern = req.body.pattern || req.body || {};

  try {
    let results = await junction.recall(pattern);
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

  var smtname = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  if (!smtname || smtname[0] === "$") throw new Error("invalid SMT name", { statusCode: 400 });
  var junction = storage.activate(config.smt[smtname]);

  var pattern = req.body.pattern || req.body || {};

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

  var smtname = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  if (!smtname || smtname[0] === "$") throw new Error("invalid SMT name", { statusCode: 400 });
  var junction = storage.activate(config.smt[smtname]);

  var pattern = req.body.pattern || req.body || {};

  try {
    let results = await junction.dull(pattern);
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

/**
 * getSMT
 * @param {*} req
 * @param {*} res
 */
async function getSMT(req, res) {
  logger.verbose('/storage/getSMT');

  var smtname = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  if (!smtname || smtname[0] === "$") throw new Error("invalid SMT name", { statusCode: 400 });

  try {
    if (config.smt[smtname])
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(config.smt[smtname]);
    else
      res.sendStatus(404);
  }
  catch (err) {
    logger.error(err.message);
    res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
  }
}

/**
 * putSMT
 * @param {*} req
 * @param {*} res
 */
async function putSMT(req, res) {
  logger.verbose('/storage/putSMT');

  var smtname = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  if (!smtname || smtname[0] === "$") throw new Error("invalid SMT name", { statusCode: 400 });
  var smt = req.body.smt || req.body;

  try {
    config.smt[smtname] = smt;
    res.status(201).set("Cache-Control", "no-store").jsonp({result: "ok"});
  }
  catch (err) {
    res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
  }
}

/**
 * dullSMT
 * @param {*} req
 * @param {*} res
 */
async function dullSMT(req, res) {
  logger.verbose('/storage/dullSMT');

  var smtname = req.params['SMT'] || req.query['smt'] || (req.body && req.body.smt);
  if (!smtname || smtname[0] === "$") throw new Error("invalid SMT name", { statusCode: 400 });

  try {
    if (config.smt[smtname]) {
      delete config.smt.smtname;
      res.status(201).set("Cache-Control", "no-store").jsonp({ result: "ok" });
    }
    else
      res.sendStatus(404);
  }
  catch (err) {
    logger.error(err.message);
    res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
  }
}
