/**
 * storage/node/node-api/transfer
 *
 * stream data from datastore to client or datastore to datastore
 */
"use strict";

const express = require('express');
const authorize = require("../authorize");
const Roles = require("../roles");
const logger = require('../../utils/logger');
const Storage = require('@dictadata/storage-junctions');
const { StorageResults, StorageError } = require('@dictadata/storage-junctions/types');
const fs = require('fs');
const stream = require('stream').promises;

/**
 * transfer routes
 */
var router = express.Router();
router.post('/transfer', authorize([ Roles.User ]), transfer);
module.exports = router;

/**
 *  transfer handler
 */
async function transfer(req, res) {
  logger.verbose('/transfer');
  logger.debug(JSON.stringify(req.body));

  const tract = req.body.tract || req.body;
  const origin = tract.origin || {};
  const terminal = tract.terminal || {};
  const transforms = tract.transform || tract.transforms || {};
  if (!origin.options) origin.options = {};
  if (!terminal.options) terminal.options = {};

  var jo, jt; // junctions origin, terminal
  try {
    /// validate parameters
    if (!origin.smt || origin.smt[ 0 ] === '$')
      throw new StorageError(400, "invalid origin smt name: " + origin.smt);
    if (!terminal.smt || terminal.smt[ 0 ] === '$')
      throw new StorageError(400, "invalid terminal smt name: " + terminal.smt);

    /// create origin junction
    logger.debug("create origin junction");
    jo = await Storage.activate(origin.smt, origin.options);

    /// get origin encoding
    logger.debug(">>> get origin encoding");
    let encoding = origin.options.encoding;
    if (!encoding && jo.capabilities.encoding) {
      let results = await jo.getEncoding();  // load encoding from origin for validation
      encoding = results.data[ "encoding" ];
    }

    /// determine terminal encoding
    logger.verbose(">>> determine terminal encoding");
    if (terminal.options && terminal.options.encoding) {
      if (typeof terminal.options.encoding === "string") {
        // read encoding from file
        let filename = terminal.options.encoding;
        terminal.options.encoding = JSON.parse(fs.readFileSync(filename, "utf8"));
      }
      //else if (typeof terminal.options.encoding !== "object") {
      //  throw "Invalid terminal encoding";
      //}
    }
    else if (!encoding || Object.keys(transforms).length > 0) {
      // otherwise run some objects through any transforms to get terminal encoding
      logger.verbose("codify pipeline");
      let pipes = [];

      let options = {
        max_read: (origin.options && origin.options.max_read) || 100,
        pattern: origin.pattern,
        reader: req
      };
      let reader = jo.createReader(options);
      reader.on('error', (error) => {
        logger.error("transfer reader: " + error.message);
      });
      pipes.push(reader);

      for (let [ tfType, tfOptions ] of Object.entries(transforms))
        pipes.push(await jo.createTransform(tfType, tfOptions));

      let codify = await jo.createTransform('codify');
      pipes.push(codify);

      await stream.pipeline(pipes);
      terminal.options.encoding = codify.encoding;
    }
    else
      // use origin encoding
      terminal.options.encoding = encoding;

    if (typeof terminal.options.encoding !== "object")
      throw new StorageError(400, "invalid terminal encoding");

    //logger.debug("encoding results");
    //logger.debug(JSON.stringify(encoding));
    //logger.debug(JSON.stringify(encoding.fields));

    /// create terminal junction
    logger.debug("create terminal junction");
    jt = await Storage.activate(terminal.smt, terminal.options);

    logger.debug("create terminal schema");
    if (jt.capabilities.encoding && !terminal.options.append) {
      let results = await jt.createSchema();
      logger.verbose(">>> createSchema");
      if (results.status !== 0)
        logger.info("could not create storage schema: " + results.message);
    }

    /// setup pipeline
    logger.debug("transfer pipeline");
    var pipes = [];

    // reader
    let options = { pattern: origin.pattern, reader: req };
    let reader = jo.createReader(options);
    reader.on('error', (error) => {
      logger.error("transfer reader: " + error.message);
    });
    pipes.push(reader);

    // transforms
    for (let [ tfName, tfOptions ] of Object.entries(transforms)) {
      let tfType = tfName.split("-")[ 0 ];
      pipes.push(await jo.createTransform(tfType, tfOptions));
    }

    // writer
    let writer = jt.createWriter({ writer: res });
    writer.on('error', (error) => {
      logger.error("transfer writer: " + error.message);
    });
    pipes.push(writer);

    // transfer data
    logger.debug(">>> start transfer");
    if (jt.smt.locus.startsWith('stream:'))
      res.type('json');
    res.set("Cache-Control", "public, max-age=60, s-maxage=60");
    await stream.pipeline(pipes);

    if (jt.smt.locus.startsWith('stream:'))
      res.end();
    else {
      let response = new StorageResults(0);
      res.jsonp(response);
    }
  }
  catch (err) {
    logger.error(err.message);
    let response = new StorageError(err.status, err.message);
    res.status(err.status || 500).jsonp(response);
  }
  finally {
    if (jo)
      jo.relax();
    if (jt)
      jt.relax();
  }

}
