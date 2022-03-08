/**
 * storage/node/cortex.js
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
  logger.info("cortex startup");
  logger.verbose("cortex SMT: " + JSON.stringify(config.cortex));

  var exitCode = 0;
  let cortex;

  try {
    if (config.cortex) {
      // create cortex
      cortex = new storage.Cortex(config.cortex);
    }

    if (cortex && config.cortex.cords) {
      // adds config.cortex.cords to cortex cache
      // because cortex junction is activated yet.
      for (let [ name, entry ] of Object.entries(config.cortex.cords)) {
        if (typeof entry === "string") {
          // assume entry is an SMT string
          let engram = new Engram(entry);
          engram.name = name;
          await cortex.store(engram.encoding);
        }
        else {
          // assume entry is a cortex entry object
          let engram = new Engram(entry.smt);
          engram.name = entry.name || name;
          if (entry.encoding) {
            if (typeof entry.encoding === "string")
              // read encoding from file
              entry.encoding = JSON.parse(fs.readFileSync(entry.encoding, 'utf-8'));
            else
              engram.encoding = entry.encoding;
            await cortex.store(engram.encoding);
          }
        }
      }
    }

    if (cortex) {
      // activate cortex junction
      await cortex.activate();
      // use cortex for SMT name lookup
      storage.cortex = cortex;
    }
  }
  catch (err) {
    logger.error('cortex startup failed: ', err);
    exitCode = 2; // startup failure
  }

  return exitCode;
};
