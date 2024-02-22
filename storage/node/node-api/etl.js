/**
 * storage/node/node-api/etl
 *
 * stream data from datastore to client or datastore to datastore
 */
"use strict";

const express = require('express');
const authorize = require("../authorize.js");
const Roles = require("../roles.js");
const logger = require('../../utils/logger.js');
const { Storage, Actions } = require('@dictadata/storage-tracts');
const { StorageResults, StorageError } = require('@dictadata/storage-junctions/types');
const config = require("../config.js");
const fs = require('fs');
const { objCopy, typeOf } = require('@dictadata/storage-junctions/utils.js');
const stream = require('stream').promises;

/**
 * etl routes
 */
var router = express.Router();
router.post('/etl', authorize([ Roles.User ]), etl);
router.post('/etl/:urn', authorize([ Roles.User ]), etl);
module.exports = router;

/**
 *  etl handler
 */
async function etl(req, res) {
  logger.verbose('/etl');
  //logger.verbose(JSON.stringify(req.body));

  try {
    let urn = req.params[ 'urn' ] || req.query[ 'urn' ] || req.body.urn || "";
    let actionName = req.query[ 'action' ] || req.body.action || "";
    let params = Object.assign({}, req.query, req.body.params);
    let tract;
    let streaming = false;
    let resultCode = 0;

    // if URN then recall from Tracts storage
    if (urn) {
      let results = await Storage.tracts.recall(urn, true);
      tract = results.data[ 0 ];

      // TBD: use query string parameters and replace variables in tract
    }
    else {
      tract = req.body.tract || req.body;
    }

    if (!actionName)
      actionName = tract.actions[ 0 ].name; // default to 1st tract

    let base = tract.actions.find((action) => action.name === "_base");

    // perform tract actions
    res.set("Cache-Control", "public, max-age=60, s-maxage=60");

    for (const action of tract.actions) {
      if (action.name[ 0 ] === "_")
        continue;

      if (action.name === actionName || actionName === "all" || actionName === "*") {

        if (!action.action)
          action.action = "transfer";

        ///////// check actions for stream: in smt.locus (e.g. node server REST API)
        // check origin
        if (!action.origin.options)
          action.origin.options = {};
        let results = await Storage.resolve(action.origin.smt, action.origin.options);
        action.origin.smt = results

        if (action.origin?.smt.locus.startsWith('stream:')) {
          action.origin.options["reader"] = req;
        }

        // check terminal
        if (!action.terminal.options)
          action.terminal.options = {};
        results = await Storage.resolve(action.terminal.smt, action.terminal.options);
        action.terminal.smt = results

        if (action.terminal?.smt.locus.startsWith('stream:')) {
          action.terminal.options[ "writer" ] = res;
          action.terminal.options[ "autoClose" ] = false;
          streaming = true;
          res.type('json');
        }

        // perform the action
        if (base)
          action = objCopy({}, base, action);
        resultCode = await Actions.perform(action, params);

        if (resultCode) {
          break;
        }
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
