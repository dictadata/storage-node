/**
 * storage/node/codex.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const logger = require("../utils/logger");
const Storage = require("@dictadata/storage-junctions");
const { Engram } = require("@dictadata/storage-junctions/types");
const fs = require("fs");

var codex;

/**
 * wait until server config is updated before initializing
 */
exports.startup = async (config) => {
  logger.info("codex startup");
  logger.verbose("codex SMT: " + JSON.stringify(config.codex.smt));

  var exitCode = 0;

  try {
    // load auth_stash
    if (config.codex.auth_stash)
      Storage.authStash.load(config.codex.auth_stash);

    if (config.codex) {
      // create codex
      codex = new Storage.Codex(config.codex.smt, config.codex.options);
    }

    if (codex) {
      // activate codex junction
      await codex.activate();

      // use codex for SMT name lookup
      Storage.codex = codex;

      await addEngrams(config.codex.engrams_cache);
    }
  }
  catch (err) {
    logger.error('codex startup failed: ', err);
    exitCode = 2; // startup failure
  }

  return exitCode;
};

// add codex entries from config.codex.engrams (local cache only)
async function addEngrams(engrams_cache) {
  if (engrams_cache) {
    for (let [ name, entry ] of Object.entries(engrams_cache)) {
      if (typeof entry === "string") {
        // assume entry is an SMT string
        let engram = new Engram(entry);
        engram.name = name;
        await codex.store(engram);
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

        await codex.store(engram);
      }
    }
  }
}
