/**
 * @dictadata/storage-node
 */
"use strict";

const StorageNode = require('../storage');
const router = require('./test-routes');

let options = {
  routes: {
    "/test": router
  }
};

StorageNode.start(options);
