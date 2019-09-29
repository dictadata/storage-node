"use strict";
/**
 * node/status.js
 */

const {authorize,roles} = require('@dicta-io/storage-node');
const express = require('express');
const config = require('../config');
const logger = require('../logger');

/**
 * status routes
 */
var router = express.Router();
router.get('/', authorize([roles.Public, roles.Monitor]), status);
router.get('/:smt', authorize([roles.User, roles.Monitor, roles.Admin]), smt_status);
module.exports = router;

function status(req, res) {
  logger.info('URI \'api\\status\' was called.');

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('OK\r\n');
  let date = new Date();
  res.write(date.toISOString() + '\r\n');
  if (config.useSessions)
    res.write('flash message: ' + req.flash('info'));
  res.end();
}

function smt_status(req, res) {
  logger.info('URI \'api\\status\' was called.');

  var smt = req.params['SMT'];

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('OK\r\n');
  let date = new Date();
  res.write(date.toISOString() + '\r\n');

  res.write(smt);

  res.end();
}

/*
function statusElastic(req, res) {
  console.log('URI \'esstatus\' was called.');

  let elastic = new Elastic(config.realm);
  elastic.status()
      .then(results => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write(results + '\r\n');
        res.end();
      })
      .catch(error => {
        res.write(error + '\r\n');
        res.end();
      });
}
*/
