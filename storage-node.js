/**
 * @dictadata/storage-node
 * EXAMPLE main file for servers derived from storage-node
 */
"use strict";

const server = require('@dictadata/storage-node');
const storage_node = require('./storage/node');

// init module startup, if needed
server.startup.add(storage_node.module1.startup);
server.startup.add(storage_node.module2.startup);

// override config
// add api routes
let config = {
  routes: {
    '/myapi': storage_node.myApi
  }
};

// start server
server.start(config);
