/**
 * storage/node/engrams.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const { Codex } = require("@dictadata/storage-junctions");
const { Engram } = require("@dictadata/storage-junctions/types");
const logger = require("../utils/logger");
const fs = require("fs");

/**
 * wait until server config is updated before initializing
 */
exports.startup = async (config) => {
  logger.info("engrams startup");
  logger.verbose("engrams SMT: " + JSON.stringify(config.codex.engrams.smt));

  var exitCode = 0;

  try {
    // load auth_stash
    if (config.codex.auth.auth_file)
      Codex.auth.load(config.codex.auth.auth_file);

    if (config.codex.engrams) {
      // create engrams junction
      let engrams = Codex.use("engram", config.codex.engrams.smt, config.codex.engrams.options);
      await engrams.activate();

      await addEngrams(config.codex.engrams.engrams_cache);
    }
  }
  catch (err) {
    logger.error('engrams startup failed: ', err);
    exitCode = 2; // startup failure
  }

  return exitCode;
};

// add engrams entries from config.codex.engrams (local cache only)
async function addEngrams(engrams_cache) {
  if (engrams_cache) {
    for (let [ name, entry ] of Object.entries(engrams_cache)) {
      if (typeof entry === "string") {
        // assume entry is an SMT string
        let engram = new Engram(entry);
        engram.name = name;
        await Codex.engrams.store(engram);
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

        await Codex.engrams.store(engram);
      }
    }
  }
}
