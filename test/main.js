/**
 * @dictadata/storage-node
 */
"use strict";

const StorageNode = require('../storage/index');
const routes = require('./myroutes');

StorageNode.start({
  routerPath: '/test',
  router: routes
});
