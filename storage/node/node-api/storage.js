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
const { StorageResponse, StorageError } = require('@dictadata/storage-junctions/types');
const { typeOf } = require('@dictadata/storage-junctions/utils');

/**
 * storage routes
 */

var router = express.Router();
router.get('/list/:SMT', authorize([ roles.Public ]), list);
router.post('/list/:SMT', authorize([ roles.Public ]), list);
router.post('/list', authorize([ roles.Public ]), list);

router.get('/encoding/:SMT', authorize([ roles.Public ]), getEncoding);
router.post('/encoding/:SMT', authorize([ roles.Public ]), getEncoding);
router.post('/encoding', authorize([ roles.Public ]), getEncoding);

router.put('/encoding/:SMT', authorize([ roles.Coder ]), createSchema);
router.put('/encoding', authorize([ roles.Coder ]), createSchema);

router.put('/store/:SMT', authorize([ roles.User ]), store);
router.put('/store', authorize([ roles.User ]), store);

router.get('/recall/:SMT', authorize([ roles.Public ]), recall);
router.post('/recall/:SMT', authorize([ roles.Public ]), recall);
router.post('/recall', authorize([ roles.Public ]), recall);

router.get('/retrieve/:SMT', authorize([ roles.Public ]), retrieve);
router.post('/retrieve/:SMT', authorize([ roles.Public ]), retrieve);
router.post('/retrieve', authorize([ roles.Public ]), retrieve);

router.delete('/dull/:SMT', authorize([ roles.User ]), dull);
router.post('/dull/:SMT', authorize([ roles.User ]), dull);
router.post('/dull', authorize([ roles.User ]), dull);

module.exports = router;

/**
 * list
 * @param {*} req
 * @param {*} res
 */
async function list(req, res) {
  logger.verbose('/storage/list');

  var junction;
  try {
    let smtname = req.params[ 'SMT' ] || req.query[ 'SMT' ] || (req.body && req.body.SMT);
    if (!smtname || smtname[ 0 ] === "$")
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(smtname);

    let schema = req.query[ 'schema' ] || (req.body && req.body.schema) || junction.smt.schema || '*';

    let response = await junction.list({ schema: schema });
    logger.debug(response);

    res.status(response.resultCode || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(response);
  }
  catch (err) {
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
async function getEncoding(req, res) {
  logger.verbose('/storage/getEncoding');

  var junction;
  try {
    let smtname = req.params[ 'SMT' ] || req.query[ "SMT" ] || (req.body && req.body.SMT);
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(smtname);
    if (!junction.capabilities.encoding)
      throw new StorageError(405);

    let response = await junction.getEncoding();
    logger.debug(response);

    res.status(response.resultCode || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(response);
  }
  catch (err) {
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
 * createSchema
 * @param {*} req
 * @param {*} res
 */
async function createSchema(req, res) {
  logger.verbose('/storage/createSchema');

  var junction;
  try {
    let smtname = req.params[ 'SMT' ] || req.query[ "SMT" ] || (req.body && req.body.SMT);
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    let newEncoding = req.body.encoding || req.body;

    junction = await storage.activate(smtname, { encoding: newEncoding });
    if (!junction.capabilities.encoding)
      throw new StorageError(405);

    let results = await junction.createSchema();
    logger.debug(results);
    res.status(results.resultCode || 200)
      .set("Cache-Control", "no-store").jsonp(results);
  }
  catch (err) {
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
async function store(req, res) {
  logger.verbose('/storage/store');

  if (!req.body)
    throw new StorageError(400, "invalid data");

  var junction;
  try {
    let smtname = req.params[ 'SMT' ] || req.query[ 'SMT' ] || (req.body && req.body.SMT);
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(smtname);
    if (!junction.capabilities.store)
      throw new StorageError(405);

    if (junction.capabilities.encoding && !junction.engram.isDefined)
      await junction.getEncoding();

    var response = new StorageResponse(0);

    // body will be an object/map of key:constructs
    if (Array.isArray(req.body)) {
      for (let construct of req.body) {
        let results = await junction.store(construct);
        let [key, value] = Object.entries(results.data)[ 0 ];
        response.add(value, (results.resultCode === 0 && key) ? key : junction.engram.get_uid(construct));
        if (results.resultCode !== 0) {
          response.resultCode = results.resultCode;
          response.resultMessage = results.resultMessage;
        }
      }
    }
    else {
      // object/map of key:construct
      for (let [ key, construct ] of Object.entries(req.body)) {
        let results = await junction.store(construct, { "key": key });
        response.add((results.resultCode === 0 && results.data) ? Object.values(results.data)[ 0 ] : results.resultMessage, key);
        if (results.resultCode !== 0) {
          response.resultCode = results.resultCode;
          response.resultMessage = results.resultMessage;
        }
      }
    }

    logger.debug(response);

    res.status(response.resultCode || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(response);
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
 * recall
 * @param {*} req
 * @param {*} res
 */
async function recall(req, res) {
  logger.verbose('/storage/recall');

  var junction;
  try {
    let smtname = req.params[ 'SMT' ] || req.query[ 'SMT' ] || (req.body && req.body.SMT);
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(smtname);

    var pattern = Object.assign({}, req.query, (req.body.pattern || req.body));

    let response = await junction.recall(pattern);
    logger.debug(response);

    res.status(response.resultCode || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(response);
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
 * retreive
 * @param {*} req
 * @param {*} res
 */
async function retrieve(req, res) {
  logger.verbose('/storage/retrieve');

  var junction;
  try {
    let smtname = req.params[ 'SMT' ] || req.query[ 'SMT' ] || (req.body && req.body.SMT);
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(smtname);

    var pattern = Object.assign({}, req.query, (req.body.pattern || req.body));

    let response = await junction.retrieve(pattern);
    logger.debug(response);

    res.status(response.resultCode || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(response);
  }
  catch (err) {
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
    let smtname = req.params[ 'SMT' ] || req.query[ 'SMT' ] || (req.body && req.body.SMT);
    if (!smtname || smtname[ 0 ] === "$" || !smtname)
      throw new StorageError(400, "invalid SMT name");

    junction = await storage.activate(smtname);

    var pattern = Object.assign({}, req.query, (req.body.pattern || req.body));

    let response = await junction.dull(pattern);
    logger.debug(response);

    res.status(response.resultCode || 200).set("Cache-Control", "public, max-age=60, s-maxage=60");
    res.jsonp(response);
  }
  catch (err) {
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}
