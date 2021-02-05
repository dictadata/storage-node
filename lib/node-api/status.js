"use strict";
/**
 * storage-node/status
 */

const express = require('express');
const authorize = require('../authorize');
const roles = require('../roles');
const config = require('../config');
const storage = require('@dictadata/storage-junctions');
const StorageError = storage.StorageError;
const logger = require('../logger');
const typeOf = storage.Types.typeOf;

/**
 * status routes
 */
var router = express.Router();
router.get('/status', authorize([roles.Public, roles.Monitor]), status);
router.get('/status/:SMT', authorize([roles.User, roles.Monitor, roles.Admin]), smt_status);
module.exports = router;

/**
 *
 * @param {*} req
 * @param {*} res
 */
function status(req, res) {
  logger.debug('/node-api/status');

  var info = {
    result: 'OK',
    name: config.name,
    version: config.version,
    time: new Date().toISOString()
  };
  //info.userid = ' + request.user.userid + '/' + request.user.password;

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write(JSON.stringify(info));
  res.end();
}

/**
 *
 * @param {*} req
 * @param {*} res
 */
async function smt_status(req, res) {
  logger.debug('/node-api/smt_status');

  var junction;
  try {
    let smtname = req.params['SMT'] || req.query["SMT"];
    if (!smtname || !config.smt[smtname]) // || smtname[0] === "$")
      throw new StorageError({statusCode: 400}, "invalid SMT name");

    junction = await storage.activate(config.smt[smtname]);

    let encoding = await junction.getEncoding();
    logger.debug(encoding);
    if (typeOf(encoding) === 'object') {
      let results = {
        result: "ok",
        SMT: smtname
      };
      res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(results);
    }
    else
      throw new StorageError({statusCode: 404}, encoding);
  }
  catch(err) {
    if (err.statusCode !== 400 && err.statusCode !== 404)
      logger.error(err);
    res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
  }
  finally {
    if (junction)
      junction.relax();
  }
}
