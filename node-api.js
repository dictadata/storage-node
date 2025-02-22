/**
 * Interface for node-api modules.
 *
 * Can be used by shims in dependent projects to make debugging easier.
 *
 */

const { accounts } = require('./storage/node/node-api/accounts');
const { engrams } = require('./storage/node/node-api/engrams');
const { etl } = require("./storage/node/node-api/etl");
const { log } = require('./storage/node/node-api/log');
const { status } = require('./storage/node/node-api/status');
const { storage } = require('./storage/node/node-api/storage');
const { tracts } = require('./storage/node/node-api/tracts');
const { user } = require('./storage/node/node-api/user');
const { webdata } = require('./storage/node/node-api/webdata');

exports.accounts = accounts;
exports.engrams = engrams;
exports.etl = etl;
exports.log = log;
exports.status = status;
exports.storage = storage;
exports.tracts = tracts;
exports.user = user;
exports.webdata = webdata;
