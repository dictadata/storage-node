"use strict";
/**
 * storage-node/status
 */

const express = require('express');
const authorize = require('../authorize');
const roles = require('../roles');
const config = require('../config');
const logger = require('../logger');

/**
 * status routes
 */
var router = express.Router();
router.get('/status', authorize([roles.Public, roles.Monitor]), status);
router.get('/status/:smt', authorize([roles.User, roles.Monitor, roles.Admin]), smt_status);
module.exports = router;

function status(req, res) {
  logger.verbose('/node/status');

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('OK\r\n');
  let date = new Date();
  res.write(date.toISOString() + '\r\n');
  if (config.useSessions)
    res.write('flash message: ' + req.flash('info'));
  res.end();
}

function smt_status(req, res) {
  logger.verbose('/node/smt_status');

  var smt = req.params['SMT'];

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('OK\r\n');
  let date = new Date();
  res.write(date.toISOString() + '\r\n');

  res.write(smt);

  res.end();
}
