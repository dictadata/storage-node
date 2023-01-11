/**
 * @dictadata/storage-node
 */
"use strict";

const server = require('../storage');
const testApi = require('./test-api');

// override config
// add api routes
let config = {
  routes: {
    "/test": testApi
  }
};

server.start(config);
