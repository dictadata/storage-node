/**
 * @dicta-io/storage-node
 */
"use strict";

const StorageNode = require('../index');
const routes = require('./routes');

console.log('starting');
console.log('Adding route: /test');
StorageNode.start({
  routerPath: '/test',
  router: routes
});
console.log('started');
