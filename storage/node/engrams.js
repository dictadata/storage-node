/**
 * storage/node/engrams.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const { Storage } = require("@dictadata/storage-tracts");
const { Engram } = require("@dictadata/storage-tracts/types");
const logger = require("../utils/logger");
const fs = require("fs");

/**
 * wait until server config is updated before initializing
 */
exports.startup = async (config) => {
  logger.info("engrams startup");
  logger.verbose("engrams SMT: " + JSON.stringify(config.engrams.smt));

  var exitCode = 0;

  try {
    // load auth_stash
    if (config.auth?.auth_file)
      Storage.auth.load(config.auth.auth_file);

    if (config.engrams) {
      // create engrams junction
      await Storage.engrams.activate(config.engrams.smt, config.engrams.options);
      await addEngrams(config.engrams.engrams_cache);
    }
  }
  catch (err) {
    logger.error('engrams startup failed: ', err);
    exitCode = 2; // startup failure
  }

  return exitCode;
};

// add engrams entries from config.engrams (local cache only)
async function addEngrams(engrams_cache) {
  if (engrams_cache) {
    for (let [ name, entry ] of Object.entries(engrams_cache)) {
      if (typeof entry === "string") {
        // assume entry is an SMT string
        let engram = new Engram(entry);
        engram.name = name;
        await Storage.engrams.store(engram);
      }
      else {
        // assume entry is an engram object
        let engram = new Engram(entry.smt);
        engram.name = entry.name || name;

        if (entry.options) {
          engram.options = entry.options;
        }
        if (entry.encoding) {
          if (typeof entry.encoding === "string")
            // read encoding from file
            engram.encoding = JSON.parse(fs.readFileSync(entry.encoding, 'utf-8'));
          else
            engram.encoding = entry.encoding;
        }

        await Storage.engrams.store(engram);
      }
    }
  }
}
