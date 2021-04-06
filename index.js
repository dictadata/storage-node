/**
 * @dictadata/storage-node
 */
"use strict";

const server = require('./storage/node/server');
const app = require('./storage/node/app');

const authenticate = require('./storage/node/authenticate');
const authorize = require('./storage/node/authorize');
const roles = require('./storage/node/roles');
const Account = require('./storage/node/account');

const startup = require('./storage/node/startup');
const logger = require('./storage/utils/logger');

exports = module.exports = server;
exports.app = app;

exports.authenticate = authenticate;
exports.authorize = authorize;
exports.roles = roles;
exports.Account = Account;

exports.startup = startup;
exports.logger = logger;  // same Winston instance as storage-junctions' logger
