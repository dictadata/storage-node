/**
 * @dictadata/storage-node
 * example main file for servers derived from storage-node
 */
"use strict";

const StorageNode = require('@dictadata/storage-node');
const myapi = require('../storage');

// init module startup, if needed
StorageNode.startup.add(myapi.module1.startup);
StorageNode.startup.add(myapi.module2.startup);

// add api routes
let config_options = {
  routes: {
    '/my-api': myapi.myrouter
  }
};

// start server
StorageNode.start(config_options);
