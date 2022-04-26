/**
 * @dictadata/storage-node
 */
"use strict";

const server = require('./node/server');
const app = require('./node/app');

const config = require('./node/config');
const authenticate = require('./node/authenticate');
const authorize = require('./node/authorize');
const roles = require('./node/roles');
const Account = require('./node/account');

const startup = require('./node/startup');
const logger = require('./utils/logger');

exports = module.exports = server;
exports.app = app;
exports.config = config;

exports.authenticate = authenticate;
exports.authorize = authorize;
exports.roles = roles;
exports.Account = Account;

exports.startup = startup;
exports.logger = logger;  // same Winston instance as storage-junctions' logger
