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
const storage = require('@dictadata/storage-junctions');
const StorageError = storage.StorageError;
const stream = require('stream/promises');


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

  var tract = req.body.tract || req.body;
  var origin = tract.origin || {};
  var terminal = tract.terminal || {};
  var transforms = tract.transforms || {};

  if (!origin.SMT || origin.SMT[0] === '$' || !config.smt[origin.SMT])
    throw new StorageError({ statusCode: 400 }, "invalid origin smt name");
  if (!terminal.SMT || terminal.SMT[0] === '$' || !config.smt[terminal.SMT])
    throw new StorageError({ statusCode: 400 }, "invalid terminal smt name");

  var jo, jt;
  try {
    jo = await storage.activate(config.smt[origin.SMT], origin.options);
    jt = await storage.activate(config.smt[terminal.SMT], terminal.options);

    let encoding = await jo.getEncoding();  // load encoding from origin for validation

    logger.verbose("build codify pipeline");
    let pipe1 = [];
    pipe1.push(jo.createReadStream({ max_read: 100 }));
    for (let [tfType, tfOptions] of Object.entries(transforms))
      pipe1.push(jo.createTransform(tfType, tfOptions));
    let cf = jo.createTransform('codify');
    pipe1.push(cf);

    logger.verbose("run pipeline");
    await stream.pipeline(pipe1);
    encoding = await cf.getEncoding();

    logger.debug("encoding results");
    logger.debug(encoding);
    logger.debug(JSON.stringify(encoding.fields));

    logger.debug("put terminal encoding");
    await jt.putEncoding(encoding);

    logger.debug("build pipeline");
    var pipes = [];
    pipes.push(jo.createReadStream());
    if (transforms) {
      logger.debug("add transforms to pipeline");
      for (let [tfType, options] of Object.entries(transforms))
        pipes.push(jo.createTransform(tfType, options));
    }
    pipes.push(jt.createWriteStream());

    logger.debug("run pipeline");
    await stream.pipeline(pipes);

    res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp({ result: "ok" });
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
