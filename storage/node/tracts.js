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
    for (let entry of tracts_cache) {

      // if string then read tract from file
      if (typeof entry === "string")
        entry = JSON.parse(fs.readFileSync(entry, 'utf-8'));

      await Storage.tracts.store(entry);
    }
  }
  else if (typeof tracts_cache === "object") {
    for (let [ name, entry ] of Object.entries(tracts_cache)) {
      entry.name = name;  // overwrites the name

      // if string then read tract from file
      if (typeof tract === "string")
        entry = JSON.parse(fs.readFileSync(entry, 'utf-8'));

      await Storage.tracts.store(entry);
    }
  }
}