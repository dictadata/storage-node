/**
 * @dictadata/storage-node
 */

const server = require('./node/server');
const app = require('./node/app');

const config = require('./node/config');
const authenticate = require('./node/authenticate');
const authorize = require('./node/authorize');
const Roles = require('./node/roles');
const Account = require('./node/account');

const startup = require('./node/startup');

module.exports = exports = server;
exports.app = app;
exports.config = config;

exports.authenticate = authenticate;
exports.authorize = authorize;
exports.Roles = Roles;
exports.Account = Account;

exports.startup = startup;
