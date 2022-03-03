/**
 * storage/node/codex.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const logger = require("../utils/logger");
const storage = require("@dictadata/storage-junctions");
const { Engram } = require("@dictadata/storage-junctions/types");
const fs = require("fs");

/**
 * wait until server config is updated before initializing
 */
exports.startup = async (config) => {
  logger.info("codex startup");
  logger.verbose("codex SMT: " + JSON.stringify(config.codex));

  var exitCode = 0;
  let codex;

  try {
    if (config.codex) {
      // create codex
      codex = new storage.Codex(config.codex);
    }

    if (codex && config.codex.entries) {
      // adds config.codex.entries to codex cache
      // because codex junction is activated yet.
      for (let [ name, entry ] of Object.entries(config.codex.entries)) {
        if (typeof entry === "string") {
          // assume entry is an SMT string
          let engram = new Engram(entry);
          engram.name = name;
          await codex.store(engram.encoding);
        }
        else {
          // assume entry is a codex entry object
          let engram = new Engram(entry.smt);
          engram.name = entry.name || name;
          if (entry.encoding) {
            if (typeof entry.encoding === "string")
              // read encoding from file
              entry.encoding = JSON.parse(fs.readFileSync(entry.encoding, 'utf-8'));
            else
              engram.encoding = entry.encoding;
            await codex.store(engram.encoding);
          }
        }
      }
    }

    if (codex) {
      // activate codex junction
      await codex.activate();
      // use codex for SMT name lookup
      storage.codex = codex;
    }
  }
  catch (err) {
    logger.error('codex startup failed: ', err);
    exitCode = 2; // startup failure
  }

  return exitCode;
};
