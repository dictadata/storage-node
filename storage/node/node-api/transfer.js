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
const { StorageResponse, StorageError } = require('@dictadata/storage-junctions/types');
const { typeOf } = require('@dictadata/storage-junctions/utils');
const stream = require('stream').promises;

/**
 * transfer routes
 */
var router = express.Router();
router.post('/transfer', authorize([ roles.ETL ]), transfer);
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
    if (!origin.SMT || origin.SMT[ 0 ] === '$')
      throw new StorageError(400, "invalid origin smt name: " + origin.SMT);
    if (!terminal.SMT || terminal.SMT[ 0 ] === '$')
      throw new StorageError(400, "invalid terminal smt name: " + terminal.SMT);

    logger.debug("create origin junction");
    jo = await storage.activate(origin.SMT, origin.options);

    let encoding;
    if (jo.capabilities.encoding && !jo.engram.isDefined) {
      let results = await jo.getEncoding();  // load encoding from origin for validation
      encoding = results.data[ "encoding" ];
    }

    logger.verbose("codify pipeline");
    let pipe1 = [];
    let cpattern = Object.assign({ max_read: 100 }, tract.origin.pattern);
    pipe1.push(jo.createReader(cpattern));
    for (let [ tfType, tfOptions ] of Object.entries(transforms))
      pipe1.push(await jo.createTransform(tfType, tfOptions));
    let cf = await jo.createTransform('codify');
    pipe1.push(cf);

    await stream.pipeline(pipe1);
    encoding = await cf.encoding;

    logger.debug("encoding results");
    logger.debug(encoding);
    logger.debug(JSON.stringify(encoding.fields));

    logger.debug("create terminal junction");
    jt = await storage.activate(terminal.SMT, terminal.options);

    logger.debug("put terminal encoding");
    jt.encoding = encoding;
    if (jt.capabilities.encoding) {
      let results = await jt.createSchema();
      let dest_mode = (results.resultCode === 0) ? "created" : "append";
    }

    logger.debug("transfer pipeline");
    var pipes = [];
    let pattern = Object.assign({}, tract.origin.pattern);
    pipes.push(jo.createReader(pattern));
    if (transforms) {
      logger.debug("add transforms to pipeline");
      for (let [ tfType, options ] of Object.entries(transforms))
        pipes.push(await jo.createTransform(tfType, options));
    }
    pipes.push(jt.createWriter());

    await stream.pipeline(pipes);

    let response = new StorageResponse(0);
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
