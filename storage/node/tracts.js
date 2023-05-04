/**
 * storage/node/tracts.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const logger = require("../utils/logger");
const Storage = require("@dictadata/storage-junctions");
const fs = require("fs");

var tracts;

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
      tracts = new Storage.Tracts(config.tracts.smt, config.tracts.options);
    }

    if (tracts) {
      // activate tracts junction
      await tracts.activate();

      // add tracts to cortex
      Storage.tracts = tracts;

      await addTracts(config.tracts.tracts_cache);
    }
  }
  catch (err) {
    logger.error('tracts startup failed: ', err);
    exitCode = 2; // startup failure
  }

  return exitCode;
};

// add tracts entries from config.tracts.engrams (local cache only)
async function addTracts(tracts_cache) {
  if (Array.isArray(tracts_cache)) {
    for (let tract of tracts_cache) {

      // if string then read tract from file
      if (typeof tract === "string")
        tract = JSON.parse(fs.readFileSync(tract, 'utf-8'));

      await tracts.store(tract);
    }
  }
  else if (typeof tracts_cache === "object") {
    for (let [ name, tract ] of Object.entries(tracts_cache)) {
      tract.name = name;  // overwrites the name

      // if string then read tract from file
      if (typeof tract === "string")
        tract = JSON.parse(fs.readFileSync(tract, 'utf-8'));

      await tracts.store(tract);
    }
  }
}
