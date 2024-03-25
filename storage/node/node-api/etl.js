/**
 * storage/node/node-api/etl
 *
 * stream data from datastore to client or datastore to datastore
 */
"use strict";

const express = require("express");
const authorize = require("../authorize.js");
const Roles = require("../roles.js");
const logger = require('../../utils/logger.js');
const { Storage, Actions } = require('@dictadata/storage-tracts');
const { StorageResults, StorageError } = require('@dictadata/storage-junctions/types');
const { objCopy } = require('@dictadata/storage-junctions/utils.js');

/**
 * etl routes
 */
var router = express.Router();
router.post('/etl', authorize([ Roles.User ]), etl);
router.post('/etl/:urn', authorize([ Roles.User ]), etl);
module.exports = exports = router;

/**
 *  etl handler
 */
async function etl(req, res) {
  logger.verbose('/etl');
  //logger.verbose(JSON.stringify(req.body));

  let urn = req.params[ 'urn' ] || req.query[ 'urn' ] || req.body.urn || "";
  let fiberName = req.query[ 'fiber' ] || req.body.fiber || "";
  let params = Object.assign({}, req.query, req.body.params);
  let tract;
  let base;
  let streaming = false;
  let resultCode = 0;

  let performAction = async (fiber) => {

    ///////// check fibers for stream: in smt.locus (e.g. node server REST API)
    // check origin
    if (!fiber.origin.options)
      fiber.origin.options = {};
    let results = await Storage.resolve(fiber.origin.smt, fiber.origin.options);
    fiber.origin.smt = results

    if (fiber.origin.smt.locus.startsWith('stream:')) {
      fiber.origin.options[ "reader" ] = req;
    }

    let terminals = fiber.terminals || [ fiber.terminal ];
    for (let terminal of terminals) {
      if (terminal) {
        if (!terminal.options)
          terminal.options = {};

        results = await Storage.resolve(terminal.smt, terminal.options);
        terminal.smt = results;

        if (terminal.smt.locus.startsWith('stream:')) {
          terminal.options[ "writer" ] = res;
          terminal.options[ "autoClose" ] = false;
          streaming = true;
          res.type('json');
        }

        if (terminal.output?.startsWith('stream:')) {
          terminal.output = res;
          streaming = true;
          res.type('json');
        }
      }
    }

    // perform the action
    resultCode = await Actions.perform(fiber, params);

    return resultCode;
  }

  try {
    // if URN then recall from Tracts storage
    if (urn) {
      let results = await Storage.tracts.recall(urn, true);
      tract = results.data[ 0 ];

      // TBD: use query string parameters and replace variables in tract
    }
    else {
      tract = req.body.tract || req.body;
    }

    if (!fiberName)
      fiberName = tract.fibers[ 0 ].name; // default to 1st tract

    // perform tract actions
    res.set("Cache-Control", "public, max-age=60, s-maxage=60");

    if (fiberName === "all" || fiberName === "*") {

      for (let fiber of tract.fibers) {
        if (fiber.name[ 0 ] === "_")
          continue;

        if (fiber.base) {
          let base = tract.fibers.find((f) => f.name === fiber.base);
          fiber = objCopy({}, base, fiber);
        }

        resultCode = await performAction(fiber, req, res);
        if (resultCode) {
          break;
        }
      }
    }
    else {
      // fibers can be chained through the resultCode
      while (fiberName) {
        let fiber = tract.fibers.find((fiber) => fiber.name === fiberName);
        if (!fiber) {
          throw { status: 400, message: "fiber name not found: " + fiberName };
        }

        if (fiber.base) {
          let base = tract.fibers.find((f) => f.name === fiber.base);
          fiber = objCopy({}, base, fiber);
        }

        resultCode = await performAction(fiber, req, res);
        fiberName = (typeof resultCode === "string") ? resultCode : "";
      }
    }

    if (streaming) {
      res.end();
    }
    else {
      let response = new StorageResults(resultCode ? 400 : 0);
      res.jsonp(response);
    }
  }
  catch (err) {
    logger.error(err);
    let response = new StorageError(err.status, err.message);
    res.status(err.status || 500).jsonp(response);
  }

}

exports.etl = etl;
