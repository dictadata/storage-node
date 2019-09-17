/**
 * server/router.js
 */
"use strict";

const express = require('express');
const passport = require('passport');

const config = require('./config');
const logger = require('./logger');
const authorize = require('./authorize');
const roles = require('./roles');

const account = require('./account');

/**
 * routes
 */
var router = express.Router();
router.use('/*', passport.authenticate('basic', {session: config.useSessions}));
router.use('/account', account);
router.get('/status', authorize([roles.Public,roles.Monitor]), status);
module.exports = router;

/**
 * /status
 */
function status(request, response) {
  //logger.info('URI \'status was called.');

  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.write('OK\r\n');
  let date = new Date();
  response.write(date.toISOString() + '\r\n');
  if (config.useSessions)
    response.write('flash message: ' + request.flash('info'));
  response.end();
}
