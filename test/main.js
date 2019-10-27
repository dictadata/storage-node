/**
 * @dictadata/storage-node
 */
"use strict";

const StorageNode = require('../index');
const routes = require('./myroutes');

StorageNode.start({
  routerPath: '/test',
  router: routes
});
