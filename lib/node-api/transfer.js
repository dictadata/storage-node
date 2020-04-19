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
      throw new StorageError({statusCode: 400}, "invalid origin smt name: " + origin.SMT);
    if (!terminal.SMT || terminal.SMT[0] === '$' || !config.smt[terminal.SMT])
      throw new StorageError({statusCode: 400}, "invalid terminal smt name: " + terminal.SMT);

    jo = await storage.activate(config.smt[origin.SMT], origin.options);
    jt = await storage.activate(config.smt[terminal.SMT], terminal.options);

    let encoding = await jo.getEncoding();  // load encoding from origin for validation

    logger.verbose("build codify pipeline");
    let pipe1 = [];
    pipe1.push(jo.getReadStream({ max_read: 100 }));
    for (let [tfType,tfOptions] of Object.entries(transforms))
      pipe1.push(jo.getTransform(tfType, tfOptions));
    let cf = jo.getTransform('codify');
    pipe1.push(cf);

    logger.verbose("run codify pipeline");
    await pipeline(pipe1);
    encoding = await cf.getEncoding();

    logger.debug("encoding results");
    logger.debug(encoding);
    logger.debug(JSON.stringify(encoding.fields));

    logger.debug("put terminal encoding");
    let encoding_result = await jt.putEncoding(encoding);
    let dest_mode = (typeof encoding_result === "object") ? "created" : "append";

    logger.debug("build transfer pipeline");
    var pipes = [];
    pipes.push(jo.getReadStream());
    if (transforms) {
      logger.debug("add transforms to pipeline");
      for (let [tfType, options] of Object.entries(transforms))
        pipes.push(jo.getTransform(tfType, options));
    }
    pipes.push(jt.getWriteStream());

    logger.debug("run transfer pipeline");
    await pipeline(pipes);

    let results = {
      result: "ok",
      origin: {
        SMT: origin.SMT
      },
      terminal: {
        SMT: terminal.SMT,
        mode: dest_mode
      }
    };

    res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(results);
  }
  catch (err) {
    logger.error(err);
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (jo)
      jo.relax();
    if (jt)
      jt.relax();
  }

}
