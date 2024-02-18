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
  logger.verbose(JSON.stringify(req.body));

  try {
    let urn = req.params[ 'urn' ] || req.query[ 'urn' ] || "";
    let actionName = req.query[ 'action' ] || "";
    let params = objCopy({}, req.query);
    let tract;
    let streaming = false;
    let resultCode = 0;

    // if URN then recall from Tracts storage
    if (urn) {
      // check for action name in urn; domain:tract#tract
      let u = urn.split('#');
      urn = u[ 0 ];
      if (u.length > 1 && !actionName)
        actionName = u[ 1 ];

      let results = await Storage.tracts.recall(urn, true);
      tract = results.data[ urn ];

      // TBD: use query string parameters and replace variables in tract
    }
    else {
      tract = req.body.tract || req.body;
    }

    if (typeOf(tract) === "object" && typeOf(tract?.actions) !== "array") {
      // reformat tract properties into actions array; for backwards compatibility
      let tt = {
        "name": actionName,
        "type": "tract",
        "actions": []
      };
      for (let [ name, action ] of Object.entries(tract)) {
        if (typeof action === "object") {
          action.name = name
          tt.actions.push(objCopy({}, action));
        }
      }
      tract = tt;
    }

    if (!actionName)
      actionName = tract.actions[0].name // default to 1st tract

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
    logger.error(err.message);
    let response = new StorageError(err.status, err.message);
    res.status(err.status || 500).jsonp(response);
  }

}
