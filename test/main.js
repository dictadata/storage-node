/**
 * @dicta-io/storage-node
 */
"use strict";

const StorageNode = require('../index');
const routes = require('./routes');
const logger = require('../lib/logger');

logger.verbose('starting');
logger.verbose('Adding route: /test');
StorageNode.start({
  routerPath: '/test',
  router: routes
});
logger.verbose('started');
