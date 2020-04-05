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
const {StorageResults, StorageError} = storage;

/**
 * storage routes
 */

var router = express.Router();
router.post('/list', authorize([roles.ETL, roles.Admin]), list);
router.post('/list/:SMT', authorize([roles.ETL, roles.Admin]), list);

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
      throw new StorageError({statusCode: 400}, "invalid SMT name");

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
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
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
      throw new StorageError({statusCode: 400}, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    let encoding = await junction.getEncoding();
    logger.debug(encoding);
    if (typeof encoding === 'object') {
      let results = {
        result: "ok",
        SMT: smtname,
        fields: encoding.fields
      };
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(results);
    }
    else
      throw new StorageError({statusCode: 404}, encoding);
  }
  catch(err) {
    if (err.statusCode !== 400 && err.statusCode !== 404)
      logger.error(err);
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
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
      throw new StorageError({statusCode: 400}, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    let newEncoding = req.body.encoding || req.body;

    let encoding = await junction.putEncoding(newEncoding);
    logger.debug(encoding);
    if (typeof encoding === 'object') {
      let results = {
        result: "ok",
        SMT: smtname,
        fields: encoding.fields
      };
      res.status(201).set("Cache-Control", "no-store").jsonp(results);
    }
    else
      throw new StorageError({statusCode: 409}, encoding);
  }
  catch(err) {
    if (err.statusCode !== 400 && err.statusCode !== 404)
      logger.error(err);
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
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

  if (!req.body.data)
    throw new StorageError({statusCode: 400}, "invalid data");

  var junction;
  try {
    let smtname = req.params['SMT'] || req.query['SMT'] || (req.body && req.body.SMT);
    if (!smtname || smtname[0] === "$" || !config.smt[smtname])
      throw new StorageError({statusCode: 400}, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    var storageResults = new StorageResults("ok");

    if (Array.isArray(req.body.data)) {
      for (let construct of req.body.data) {
        let results = await junction.store(construct);
        storageResults.add(results.result === "ok" && results.data ? Object.keys(results.data)[0] : results.result );
        if (results.result !== 'ok')
          storageResults.result = results.result;
      }
    }
    else {
      for (let [key, construct] of Object.entries(req.body.data)) {
        let results = await junction.store(construct, {key: key});
        storageResults.add( (results.result === "ok" && results.data ? Object.values(results.data)[0] : results.result), key);
        if (results.result !== 'ok')
          storageResults.result = results.result;
      }
    }

    res.set("Cache-Control", "no-store").jsonp(storageResults);
  }
  catch(err) {
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
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
      throw new StorageError({statusCode: 400}, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    let pattern = req.body.pattern || req.body || {};

    let results = await junction.recall(pattern);
    if (results.result === 'ok') {
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
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
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
      throw new StorageError({statusCode: 400}, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    let pattern = req.body.pattern || req.body || {};

    let results = await junction.retrieve(pattern);
    if (results.result === 'ok') {
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
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
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
      throw new StorageError({statusCode: 400}, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    var pattern = req.body.pattern || req.body || {};

    let results = await junction.dull(pattern);
    if (results.result === 'ok')
      res.set("Cache-Control", "no-store").jsonp(results);
    else if (results.result === 'not found')
      res.status(404).jsonp(results);
    else
      res.status(400).jsonp(results);
  }
  catch (err) {
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
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
    throw new StorageError({statusCode: 400}, "invalid SMT name");

  try {
    if (config.smt[smtname])
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(config.smt[smtname]);
    else
      res.sendStatus(404);
  }
  catch (err) {
    logger.error(err);
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
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
    throw new StorageError({statusCode: 400}, "invalid SMT name");

  var smt = req.body.smt || req.body;

  try {
    config.smt[smtname] = smt;
    res.status(201).set("Cache-Control", "no-store").jsonp({result: "ok"});
  }
  catch (err) {
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
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
    throw new StorageError({statusCode: 400}, "invalid SMT name");

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
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
}
