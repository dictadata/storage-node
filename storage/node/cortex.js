/**
 * storage/node/cortex.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const logger = require("../utils/logger");
const Storage = require("@dictadata/storage-junctions");
const fs = require("fs");

var cortex;

/**
 * wait until server config is updated before initializing
 */
exports.startup = async (config) => {
  logger.info("cortex startup");
  logger.verbose("cortex SMT: " + JSON.stringify(config.cortex.smt));

  var exitCode = 0;

  try {
    if (config.cortex) {
      // create cortex
      cortex = new Storage.Cortex(config.cortex.smt, config.cortex.options);
    }

    if (cortex) {
      // activate cortex junction
      await cortex.activate();

      // add cortex to Storage
      Storage.cortex = cortex;

      await addTracts(config.cortex.cortex_cache);
    }
  }
  catch (err) {
    logger.error('cortex startup failed: ', err);
    exitCode = 2; // startup failure
  }

  return exitCode;
};

// add tracts entries from config.cortex.cortex_cache (local cache only)
async function addTracts(cortex_cache) {
  if (Array.isArray(cortex_cache)) {
    for (let entry of cortex_cache) {

      // if string then read tract from file
      if (typeof entry === "string")
        entry = JSON.parse(fs.readFileSync(entry, 'utf-8'));

      await cortex.store(entry);
    }
  }
  else if (typeof cortex_cache === "object") {
    for (let [ name, entry ] of Object.entries(cortex_cache)) {
      entry.name = name;  // overwrites the name

      // if string then read tract from file
      if (typeof tract === "string")
        entry = JSON.parse(fs.readFileSync(entry, 'utf-8'));

      await cortex.store(entry);
    }
  }
}
