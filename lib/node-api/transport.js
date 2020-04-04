/**
 * storage-node/transport
 *
 * transfers between:
 *  storage-nodes
 */
"use strict";

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const config = require('../config');
const logger = require('../logger');
const stream = require('stream');
const util = require('util');
const storage = require('@dictadata/storage-junctions');
const StorageError = storage.StorageError;

const pipeline = util.promisify(stream.pipeline);

/**
 * transfer routes
 */
var router = express.Router();
router.post('/transport', authorize([roles.ETL, roles.Admin]), transport);
module.exports = router;

/**
 *  transfer handlers
 */

async function transport(req, res) {
  logger.verbose('/transport');
  logger.debug(req.body);

  var source = req.body.source || {};
  var destination = req.body.destination || {};
  var transforms = req.body.transforms || {};

  if (!source.SMT || source.SMT[0] === '$' || !config.smt[source.SMT])
    throw new StorageError({statusCode: 400}, "invalid source smt name");
  if (!destination.SMT || destination.SMT[0] === '$' || !config.smt[destination.SMT])
    throw new StorageError({statusCode: 400}, "invalid destination smt name");

  var j1, j2;
  try {
    j1 = await storage.activate(config.smt[source.SMT], source.options);
    j2 = await storage.activate(config.smt[destination.SMT], destination.options);

    let source_encoding = await j1.getEncoding();  // load encoding from source for validation

    logger.verbose("build codify pipeline");
    let pipe1 = [];
    pipe1.push(j1.getReadStream({ max_read: 100 }));
    for (let [tfType,tfOptions] of Object.entries(transforms))
      pipe1.push(j1.getTransform(tfType, tfOptions));
    let cf = j1.getTransform('codify');
    pipe1.push(cf);

    logger.verbose("run pipeline");
    await pipeline(pipe1);
    let encoding = await cf.getEncoding();

    logger.debug("encoding results");
    logger.debug(encoding);
    logger.debug(JSON.stringify(encoding.fields));

    logger.debug("put destination encoding");
    await j2.putEncoding(encoding);

    logger.debug("build pipeline");
    var pipes = [];
    pipes.push(j1.getReadStream());
    if (transforms) {
      logger.debug("add transforms to pipeline");
      for (let [tfType, options] of Object.entries(transforms))
        pipes.push(j1.getTransform(tfType, options));
    }
    pipes.push(j2.getWriteStream());

    logger.debug("run pipeline");
    await pipeline(pipes);

    res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp({ result: "ok" });
  }
  catch (err) {
    logger.error(err);
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (j1)
      j1.relax();
    if (j2)
      j2.relax();
  }

}
