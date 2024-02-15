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
    let tractname = req.query[ 'tract' ] || "";
    let params = objCopy({}, req.query);
    let tracts;
    let streaming = false;
    let resultCode = 0;

    // if URN then recall from tracts
    if (urn) {
      // check for tract name in urn; domain:name#tract
      let u = urn.split('#');
      urn = u[ 0 ];
      if (u.length > 1 && !tractname)
        tractname = u[ 1 ];

      let results = await Storage.tracts.recall(urn, true);
      tracts = results.data[ urn ];

      // TBD: use query string parameters and replace variables in tract
    }
    else {
      tracts = req.body.tracts || req.body;
    }

    if (typeOf(tracts) === "object" && typeOf(tracts?.tracts) !== "array") {
      // reformat tract properties into an array; for backwards compatibility
      let tt = {
        "name": tractname,
        "type": "tract",
        "tracts": []
      };
      for (let [ name, tract ] of Object.entries(tracts)) {
        if (typeof tract === "object") {
          tract.name = name
          tt.tracts.push(objCopy({}, tract));
        }
      }
      tracts = tt;
    }

    if (!tractname)
      tractname = tracts.tracts[0].name // default to 1st tract

    // perform tract actions
    for (const tract of tracts.tracts) {
      if (tract.name[ 0 ] === "_")
        continue;

      if (tract.name === tractname || tractname === "all" || tractname === "*") {

        if (!tract.action)
          tract.action = "transfer";

        ///////// check tracts for stream: in smt.locus (e.g. node server REST API)
        // check origin
        if (!tract.origin.options) tract.origin.options = {};
        tract.origin.smt = await Storage.resolve(tract.origin.smt, tract.origin.options);

        if (tract.origin?.smt.locus.startsWith('stream:')) {
          tract.origin.options["reader"] = req;
        }

        // check terminal
        if (!tract.terminal.options) tract.terminal.options = {};
        tract.terminal.smt = await Storage.resolve(tract.terminal.smt, tract.terminal.options);

        if (tract.terminal?.smt.locus.startsWith('stream:')) {
          tract.terminal.options[ "writer" ] = res;
          streaming = true;
          res.type('json');
        }

        // perform the tract
        res.set("Cache-Control", "public, max-age=60, s-maxage=60");
        resultCode = await Actions.perform(tract, params);

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
