/**
 * @dictadata/storage-node
 */
"use strict";

const server = require('./lib/server');
const app = require('./lib/app');

const authenticate = require('./lib/authenticate');
const authorize = require('./lib/authorize');
const roles = require('./lib/roles');
const Account = require('./lib/account');

const startup = require('./lib/startup');
const logger = require('./lib/logger');

exports = module.exports = server;
exports.app = app;

exports.authenticate = authenticate;
exports.authorize = authorize;
exports.roles = roles;
exports.Account = Account;

exports.startup = startup;
exports.logger = logger;  // same Winston instance as storage-junctions' logger
