/**
 * @dictadata/storage-node
 */
"use strict";

const server = require('../storage');
const testApi = require('./test-api.js');
const Package = require('../package.json');

// override config
// add api routes
let config = {
  name: Package.name,
  version: Package.version,

  routes: {
    "/test": testApi
  }
};

server.start(config);
