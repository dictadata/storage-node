/**
 * storage/node/node-api/storage.js
*/
"use strict";

const express = require("express");
const authorize = require("../authorize");
const Roles = require("../roles");
const config = require("../config.js");
const { logger } = require('@dictadata/lib')
const { Storage } = require('@dictadata/storage-tracts');
const { StorageResults, StorageError } = require('@dictadata/storage-junctions/types');
const { objCopy } = require('@dictadata/lib');

/**
 * storage routes
 */

var router = express.Router();
router.get('/list/:smt', authorize([ Roles.Public ]), list);
router.post('/list/:smt', authorize([ Roles.Public ]), list);
router.post('/list', authorize([ Roles.Public ]), list);

router.put('/schema/:smt', authorize([ Roles.Coder ]), createSchema);
router.put('/schema', authorize([ Roles.Coder ]), createSchema);

router.delete('/schema/:smt', authorize([ Roles.Coder ]), dullSchema);
router.delete('/schema', authorize([ Roles.Coder ]), dullSchema);

router.get('/schema/:smt', authorize([ Roles.Public ]), getEngram);
router.post('/schema/:smt', authorize([ Roles.Public ]), getEngram);
router.post('/schema', authorize([ Roles.Public ]), getEngram);
/*
router.get('/engram/:smt', authorize([ Roles.Public ]), getEngram);
router.post('/engram/:smt', authorize([ Roles.Public ]), getEngram);
router.post('/engram', authorize([ Roles.Public ]), getEngram);
*/
router.put('/store/:smt', authorize([ Roles.User ]), store);
router.put('/store', authorize([ Roles.User ]), store);

router.delete('/dull/:smt', authorize([ Roles.User ]), dull);
router.post('/dull/:smt', authorize([ Roles.User ]), dull);
router.post('/dull', authorize([ Roles.User ]), dull);

router.get('/recall/:smt', authorize([ Roles.Public ]), recall);
router.post('/recall/:smt', authorize([ Roles.Public ]), recall);
router.post('/recall', authorize([ Roles.Public ]), recall);

router.get('/retrieve/:smt', authorize([ Roles.Public ]), retrieve);
router.post('/retrieve/:smt', authorize([ Roles.Public ]), retrieve);
router.post('/retrieve', authorize([ Roles.Public ]), retrieve);

module.exports = exports = router;

/**
 * list
 * @param {*} req
 * @param {*} res
 */
async function list(req, res) {
  logger.verbose('/storage/list');

  var junction;
  try {
    let smtname = req.params[ 'smt' ] || req.query[ 'smt' ] || req.body?.[ 'smt' ];
    if (!smtname || smtname[ 0 ] === "$")
      throw new StorageError(400, "invalid SMT name");

    let options = Object.assign({}, req.query, { dataPath: config.dataPath });
    junction = await Storage.activate(smtname, options);

    let schema = req.query[ 'schema' ] || req.body?.schema || junction.smt.schema || '*';

    let results = await junction.list({ schema: schema });
    logger.debug(JSON.stringify(results));

    res.status(results.status || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(results);
  }
  catch (err) {
    logger.error(err.message);
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}

/**
 * createSchema
 * @param {*} req
 * @param {*} res
 */
async function createSchema(req, res) {
  logger.verbose('/storage/createSchema');

  var junction;
  try {
    let smtname = req.params[ 'smt' ] || req.query[ "smt" ] || req.body?.smt;
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    let newEncoding = req.body.encoding || req.body;

    let options = Object.assign({}, req.query, { dataPath: config.dataPath, encoding: newEncoding });
    junction = await Storage.activate(smtname, options);
    if (!junction.capabilities.encoding)
      throw new StorageError(405);

    let results = await junction.createSchema();
    logger.debug(JSON.stringify(results));
    res.status(results.status || 200)
      .set("Cache-Control", "no-store")
      .jsonp(results);
  }
  catch (err) {
    if (err.status !== 400 && err.status !== 409)
      logger.error(err.message);
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}

/**
 * dullSchema
 * @param {*} req
 * @param {*} res
 */
async function dullSchema(req, res) {
  logger.verbose('/storage/dullSchema');

  var junction;
  try {
    let smtname = req.params[ 'smt' ] || req.query[ "smt" ] || req.body?.smt;
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    let options = Object.assign({}, req.query, { dataPath: config.dataPath });
    junction = await Storage.activate(smtname, options);

    let results = await junction.dullSchema();
    logger.debug(JSON.stringify(results));
    res.status(results.status || 200)
      .set("Cache-Control", "no-store").jsonp(results);
  }
  catch (err) {
    if (err.status !== 400)
      logger.error(err.message);
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}

/**
 * getEngram
 * @param {*} req
 * @param {*} res
 */
async function getEngram(req, res) {
  logger.verbose('/storage/getEngram');

  var junction;
  try {
    let smtname = req.params[ 'smt' ] || req.query[ "smt" ] || req.body?.smt;
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    let options = Object.assign({}, req.query, { dataPath: config.dataPath });
    junction = await Storage.activate(smtname, options);
    if (!junction.capabilities.encoding)
      throw new StorageError(405);

    let results = await junction.getEngram();
    logger.debug(JSON.stringify(results));

    res.status(results.status || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(results);
  }
  catch (err) {
    if (err.status !== 400 && err.status !== 404)
      logger.error(err.message);
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
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
async function store(req, res) {
  logger.verbose('/storage/store');

  if (!req.body)
    throw new StorageError(400, "invalid data");

  var junction;
  try {
    let smtname = req.params[ 'smt' ] || req.query[ 'smt' ] || req.body?.smt;
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    let options = Object.assign({}, req.query, { dataPath: config.dataPath });
    junction = await Storage.activate(smtname, options);
    if (!junction.capabilities.store)
      throw new StorageError(405);

    if (junction.capabilities.encoding && !junction.engram.isDefined)
      await junction.getEngram();

    var results = new StorageResults(0);

    // body will be an object/map of key:constructs
    if (Array.isArray(req.body)) {
      for (let construct of req.body) {
        let st_results = await junction.store(construct);
        let [key, value] = Object.entries(st_results.data)[ 0 ];
        results.add(value, (st_results.status === 0 && key) ? key : junction.engram.get_uid(construct));
        if (st_results.status !== 0) {
          results.status = st_results.status;
          results.message = st_results.message;
        }
      }
    }
    else {
      // object/map of key:construct
      for (let [ key, construct ] of Object.entries(req.body)) {
        let st_results = await junction.store(construct, { "key": key });
        results.add((st_results.status === 0 && st_results.data) ? Object.values(st_results.data)[ 0 ] : st_results.message, key);
        if (st_results.status !== 0) {
          results.status = st_results.status;
          results.message = st_results.message;
        }
      }
    }

    logger.debug(JSON.stringify(results));

    res.status(results.status || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(results);
  }
  catch (err) {
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
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
async function recall(req, res) {
  logger.verbose('/storage/recall');

  var junction;
  try {
    let smtname = req.params[ 'smt' ] || req.query[ 'smt' ] || req.body?.smt;
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    let options = Object.assign({}, req.query, { dataPath: config.dataPath });
    junction = await Storage.activate(smtname, options);

    var pattern = objCopy({}, req.query, (req.body.pattern || req.body));

    let results = await junction.recall(pattern);
    logger.debug(JSON.stringify(results));

    res.status(results.status || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(results);
  }
  catch (err) {
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
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
async function retrieve(req, res) {
  logger.verbose('/storage/retrieve');

  var junction;
  try {
    let smtname = req.params[ 'smt' ] || req.query[ 'smt' ] || req.body?.smt;
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    let options = Object.assign({}, req.query, { dataPath: config.dataPath });
    junction = await Storage.activate(smtname, options);

    var pattern = objCopy({}, req.query, (req.body.pattern || req.body));

    let results = await junction.retrieve(pattern);
    logger.debug(JSON.stringify(results));

    res.status(results.status || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(results);
  }
  catch (err) {
    logger.error(err.message);
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
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
    let smtname = req.params[ 'smt' ] || req.query[ 'smt' ] || req.body?.smt;
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    let options = Object.assign({}, req.query, { dataPath: config.dataPath });
    junction = await Storage.activate(smtname, options);

    var pattern = objCopy({}, req.query, (req.body.pattern || req.body));

    let results = await junction.dull(pattern);
    logger.debug(JSON.stringify(results));

    res.status(results.status || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(results);
  }
  catch (err) {
    res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}
