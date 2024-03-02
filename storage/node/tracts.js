/**
 * storage/node/tracts.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const { Storage } = require("@dictadata/storage-tracts");
const logger = require("../utils/logger");
const fs = require("fs");

/**
 * wait until server config is updated before initializing
 */
exports.startup = async (config) => {
  logger.info("tracts startup");
  logger.verbose("tracts SMT: " + JSON.stringify(config.tracts.smt));

  var exitCode = 0;

  try {
    if (config.tracts) {
      // create tracts
      await Storage.tracts.activate(config.tracts.smt, config.tracts.options);
      await addTracts(config.tracts.tracts_cache);
    }
  }
  catch (err) {
    logger.error('tracts startup failed: ', err);
    exitCode = 2; // startup failure
  }

  return exitCode;
};

// add tracts entries from config.tracts.tracts_cache (local cache only)
async function addTracts(tracts_cache) {
  if (Array.isArray(tracts_cache)) {
    for (let filename of tracts_cache) {
      if (typeof filename === "string") {
        let entry = JSON.parse(fs.readFileSync(filename, 'utf-8'));
        await Storage.tracts.store(entry);
      }
    }
  }
}
