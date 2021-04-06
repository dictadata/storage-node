/**
 * storage-node/storage.js
*/
"use strict";

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const config = require("../config.js");
const logger = require('../../utils/logger');
const storage = require('@dictadata/storage-junctions');
const { StorageResults, StorageError } = require('@dictadata/storage-junctions').types;
const { typeOf } = require('@dictadata/storage-junctions').utils;

/**
 * storage routes
 */

var router = express.Router();
router.get('/list/:SMT', authorize([roles.ETL, roles.Admin]), list);
router.post('/list/:SMT', authorize([roles.ETL, roles.Admin]), list);
router.post('/list', authorize([roles.ETL, roles.Admin]), list);

router.get('/encoding/:SMT', authorize([roles.ETL, roles.Admin]), getEncoding);
router.post('/encoding/:SMT', authorize([roles.ETL, roles.Admin]), getEncoding);
router.post('/encoding', authorize([roles.ETL, roles.Admin]), getEncoding);

router.put('/encoding/:SMT', authorize([roles.ETL, roles.Admin]), putEncoding);
router.put('/encoding', authorize([roles.ETL, roles.Admin]), putEncoding);

router.put('/store/:SMT', authorize([roles.User, roles.Admin]), store);
router.put('/store', authorize([roles.User, roles.Admin]), store);

router.get('/recall/:SMT', authorize([roles.User, roles.Admin]), recall);
router.post('/recall/:SMT', authorize([roles.User, roles.Admin]), recall);
router.post('/recall', authorize([roles.User, roles.Admin]), recall);

router.get('/retrieve/:SMT', authorize([roles.User, roles.Admin]), retrieve);
router.post('/retrieve/:SMT', authorize([roles.User, roles.Admin]), retrieve);
router.post('/retrieve', authorize([roles.User, roles.Admin]), retrieve);

router.delete('/dull/:SMT', authorize([roles.User, roles.Admin]), dull);
router.delete('/dull', authorize([roles.User, roles.Admin]), dull);

router.get('/smt/:SMT', authorize([roles.ETL, roles.Admin]), getSMT);
router.put('/smt/:SMT', authorize([roles.ETL, roles.Admin]), putSMT);
router.put('/smt', authorize([roles.ETL, roles.Admin]), putSMT);
router.delete('/smt', authorize([roles.ETL, roles.Admin]), dullSMT);
router.delete('/smt/:SMT', authorize([roles.ETL, roles.Admin]), dullSMT);
module.exports = router;

/**
 * list
 * @param {*} req
 * @param {*} res
 */
async function list (req, res) {
  logger.verbose('/storage/list');

  var junction;
  try {
    let smtname = req.params['SMT'] || req.query['SMT'] || (req.body && req.body.SMT);
    if (!smtname || smtname[0] === "$" || !config.smt[smtname])
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    let schema = req.query['schema'] || (req.body && req.body.schema) || junction.smt.schema || '*';

    let list = await junction.list({ schema: schema });
    logger.debug(list);
    if (Array.isArray(list)) {
      let response = { result: "ok", list: list };
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(response);
    }
    else
      res.sendStatus(500);
  }
  catch(err) {
    logger.error(err);
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}

/**
 * getEncoding
 * @param {*} req
 * @param {*} res
 */
async function getEncoding (req, res) {
  logger.verbose('/storage/getEncoding');

  var junction;
  try {
    let smtname = req.params['SMT'] || req.query["SMT"] || (req.body && req.body.SMT);
    if (!smtname || smtname[0] === "$" || !config.smt[smtname])
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    let encoding = await junction.encoding;
    logger.debug(encoding);
    if (typeOf(encoding) === 'object') {
      let results = {
        result: "ok",
        SMT: smtname,
        fields: encoding.fields
      };
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(results);
    }
    else
      throw new StorageError(404, encoding);
  }
  catch(err) {
    if (err.resultCode !== 400 && err.resultCode !== 404)
      logger.error(err);
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
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

  var junction;
  try {
    let smtname = req.params['SMT'] || req.query["SMT"] || (req.body && req.body.SMT);
    if (!smtname || smtname[0] === "$" || !config.smt[smtname])
      throw new StorageError(400, "invalid SMT name");

    let newEncoding = req.body.encoding || req.body;

    junction = await storage.activate(config.smt[smtname], { encoding: newEncoding });

    let encoding = await junction.createSchema();
    logger.debug(encoding);
    if (typeOf(encoding) === 'object') {
      let results = {
        result: "ok",
        SMT: smtname,
        fields: encoding.fields
      };
      res.status(201).set("Cache-Control", "no-store").jsonp(results);
    }
    else
      throw new StorageError(409, encoding);
  }
  catch(err) {
    if (err.resultCode !== 400 && err.resultCode !== 409)
      logger.error(err);
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
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

  if (!req.body)
    throw new StorageError(400, "invalid data");

  var junction;
  try {
    let smtname = req.params['SMT'] || req.query['SMT'] || (req.body && req.body.SMT);
    if (!smtname || smtname[0] === "$" || !config.smt[smtname])
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);
    await junction.getEncoding();

    var storageResults = new StorageResults(0);

    // body will be an array of constructs
    // or a object/map of key:constructs
    if (Array.isArray(req.body)) {
      for (let construct of req.body) {
        let results = await junction.store(construct);
        let key = Object.keys(results.data)[0];
        storageResults.add(results.resultCode === 0 && key ? key : junction.engram.get_uid(construct) );
        if (results.resultCode !== 0) {
          storageResults.resultCode = results.resultCode;
          storageResults.resultText = results.resultText;
        }
      }
    }
    else {
      // object/map of key:construct
      for (let [key, construct] of Object.entries(req.body)) {
        let results = await junction.store(construct, {"key": key});
        storageResults.add( (results.resultCode === 0 && results.data ? Object.values(results.data)[0] : results.resultText), key);
        if (results.resultCode !== 0) {
          storageResults.resultCode = results.resultCode;
          storageResults.resultText = results.resultText;
        }
      }
    }

    res.set("Cache-Control", "no-store").jsonp(storageResults);
  }
  catch(err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
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

  var junction;
  try {
    let smtname = req.params['SMT'] || req.query['SMT'] || (req.body && req.body.SMT);
    if (!smtname || smtname[0] === "$" || !config.smt[smtname])
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    var pattern = Object.assign({}, req.query, (req.body.pattern || req.body));

    let results = await junction.recall(pattern);
    if (results.resultCode === 0) {
      let response = {
        result: results.result,
        SMT: smtname,
        data: results.data
      };
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(response);
    }
    else if (results.result === 'not found')
      res.status(404).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch(err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
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

  var junction;
  try {
    let smtname = req.params['SMT'] || req.query['SMT'] || (req.body && req.body.SMT);
    if (!smtname || smtname[0] === "$" || !config.smt[smtname])
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    var pattern = Object.assign({}, req.query, (req.body.pattern || req.body));

    let results = await junction.retrieve(pattern);
    if (results.resultCode === 0) {
      let response = {
        result: results.result,
        SMT: smtname,
        data: results.data
      };
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(response);
    }
    else if (results.result === 'not found')
      res.status(404).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch(err) {
    logger.error(err);
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
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

  var junction;
  try {
    let smtname = req.params['SMT'] || req.query['SMT'] || (req.body && req.body.SMT);
    if (!smtname || smtname[0] === "$" || !config.smt[smtname])
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    var pattern = Object.assign({}, req.query, (req.body.pattern || req.body));

    let results = await junction.dull(pattern);
    if (results.resultCode === 0)
      res.set("Cache-Control", "no-store").jsonp(results);
    else if (results.result === 'not found')
      res.status(404).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch (err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
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

  var smtname = req.params['SMT'] || req.query['SMT'] || (req.body && req.body.SMT);
  if (!smtname || smtname[0] === "$" || !config.smt[smtname])
    throw new StorageError(400, "invalid SMT name");

  try {
    if (config.smt[smtname])
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(config.smt[smtname]);
    else
      res.sendStatus(404);
  }
  catch (err) {
    logger.error(err);
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}

/**
 * putSMT
 * @param {*} req
 * @param {*} res
 */
async function putSMT(req, res) {
  logger.verbose('/storage/putSMT');

  var smtname = req.params['SMT'] || req.query['SMT'] || (req.body && req.body.SMT);
  if (!smtname || smtname[0] === "$" || !config.smt[smtname])
    throw new StorageError(400, "invalid SMT name");

  var smt = req.body.smt || req.body;

  try {
    config.smt[smtname] = smt;
    res.status(201).set("Cache-Control", "no-store").jsonp({result: "ok"});
  }
  catch (err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}

/**
 * dullSMT
 * @param {*} req
 * @param {*} res
 */
async function dullSMT(req, res) {
  logger.verbose('/storage/dullSMT');

  var smtname = req.params['SMT'] || req.query['SMT'] || (req.body && req.body.SMT);
  if (!smtname || smtname[0] === "$" || !config.smt[smtname])
    throw new StorageError(400, "invalid SMT name");

  try {
    if (config.smt[smtname]) {
      delete config.smt.smtname;
      res.status(201).set("Cache-Control", "no-store").jsonp({ result: "ok" });
    }
    else
      res.sendStatus(404);
  }
  catch (err) {
    logger.error(err);
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}
