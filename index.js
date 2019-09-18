/**
 * @dicta-io/storage-node
 */
"use strict";

const Server = require('./lib/server');
const app = require('./lib/app');
const authorize = require('./lib/authorize');
const roles = require('./lib/roles');

exports = module.exports = Server;

exports.app = app;
exports.authorize = authorize;
exports.roles = roles;
