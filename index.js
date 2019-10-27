/**
 * @dictadata/storage-node
 */
"use strict";

const Server = require('./lib/server');
const app = require('./lib/app');
const startup = require('./lib/startup');
const authorize = require('./lib/authorize');
const roles = require('./lib/roles');
const logger = require('./lib/logger');

exports = module.exports = Server;

exports.app = app;
exports.authorize = authorize;
exports.roles = roles;
exports.startup = startup;
exports.logger = logger;
