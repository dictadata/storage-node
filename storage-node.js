/**
 * @dictadata/storage-node
 * EXAMPLE main file for servers derived from storage-node
 */
"use strict";

const server = require('@dictadata/storage-node');
const myNode = require('./storage/node');
const Package = require('./package.json');

// init module startup, if needed
server.startup.add(myNode.module1.startup);
server.startup.add(myNode.module2.startup);

// override config
// add api routes
let config = {
  name: Package.name,
  version: Package.version,

  routes: {
    '/myapi': myNode.myApi
  }
};

// start server
server.start(config);
