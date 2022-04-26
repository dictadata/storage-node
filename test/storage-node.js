/**
 * @dictadata/storage-node
 */
"use strict";

const StorageNode = require('../storage');
const router = require('./test-routes');

let config_options = {
  routes: {
    "/test": router
  }
};

StorageNode.start(config_options);
