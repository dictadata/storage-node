/**
 * @dicta-io/storage-node
 */
"use strict";

const StorageNode = require('../index');
const routes = require('./routes');

StorageNode.start({
  routerPath: '/test',
  router: routes
});
