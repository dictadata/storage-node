/**
 * storage-node/transfer
 *
 * transfers between:
 *  storage-node and storage sources
 */
"use strict";

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const config = require('../config');
const logger = require('../../utils/logger');
const storage = require('@dictadata/storage-junctions');
const { StorageError } = require('@dictadata/storage-junctions').types;
const { typeOf } = require('@dictadata/storage-junctions').utils;
const stream = require('stream/promises');


/**
 * transfer routes
 */
var router = express.Router();
router.post('/transfer', authorize([roles.ETL, roles.Admin]), transfer);
module.exports = router;

/**
 *  transfer handlers
 */

async function transfer(req, res) {
  logger.verbose('/transfer');
  logger.debug(req.body);

  var tract = req.body.tract || req.body;
  var origin = tract.origin || {};
  var terminal = tract.terminal || {};
  var transforms = tract.transforms || {};

  var jo, jt;
  try {
    if (!origin.SMT || origin.SMT[0] === '$' || !config.smt[origin.SMT])
      throw new StorageError(400, "invalid origin smt name: " + origin.SMT);
    if (!terminal.SMT || terminal.SMT[0] === '$' || !config.smt[terminal.SMT])
      throw new StorageError(400, "invalid terminal smt name: " + terminal.SMT);

    jo = await storage.activate(config.smt[origin.SMT], origin.options);
    jt = await storage.activate(config.smt[terminal.SMT], terminal.options);

    let encoding;
    if (jo.capabilities.encoding && !jo.engram.isDefined) {
      let results = await jo.getEncoding();  // load encoding from origin for validation
      encoding = results.data["encoding"];
    }

    logger.verbose("codify pipeline");
    let pipe1 = [];
    pipe1.push(jo.createReader({ max_read: 100 }));
    for (let [tfType, tfOptions] of Object.entries(transforms))
      pipe1.push(jo.createTransform(tfType, tfOptions));
    let cf = jo.createTransform('codify');
    pipe1.push(cf);

    await stream.pipeline(pipe1);
    encoding = await cf.encoding;

    logger.debug("encoding results");
    logger.debug(encoding);
    logger.debug(JSON.stringify(encoding.fields));

    logger.debug("put terminal encoding");
    jt.encoding = encoding;
    if (jt.capabilities.encoding) {
      let results = await jt.createSchema();
      let dest_mode = (results.resultCode === 0) ? "created" : "append";
    }

    logger.debug("transfer pipeline");
    var pipes = [];
    pipes.push(jo.createReader());
    if (transforms) {
      logger.debug("add transforms to pipeline");
      for (let [tfType, options] of Object.entries(transforms))
        pipes.push(jo.createTransform(tfType, options));
    }
    pipes.push(jt.createWriter());

    await stream.pipeline(pipes);

    let response = new storage.StorageResponse(0);
    res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(response);
  }
  catch (err) {
    logger.error(err);
    res.status(err.resultCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (jo)
      jo.relax();
    if (jt)
      jt.relax();
  }

}
