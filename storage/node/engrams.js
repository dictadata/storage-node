/**
 * storage/node/engrams.js
 *
 * Return a method used for Passport authentication.
 *
 */
"use strict";

const { Storage } = require("@dictadata/storage-tracts");
const { Engram } = require("@dictadata/storage-tracts/types");
const { objCopy } = require("@dictadata/lib");
const { logger } = require('@dictadata/lib')
const { readFile } = require('node:fs/promises');

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
    for (let [ urn, entry ] of Object.entries(engrams_cache)) {
      if (typeof entry === "string") {
        // assume entry is an SMT string
        let engram = new Engram(entry);
        engram.urn = urn;
        await Storage.engrams.store(engram);
      }
      else {
        // assume entry is an object
        if (entry.engram) {
          let encoding = JSON.parse(await readFile(entry.engram, 'utf-8'));
          delete entry.engram;
          entry = objCopy(encoding, entry);
        }
        else
          entry.urn = urn;

        let engram = new Engram(entry);

        let results = await Storage.engrams.store(engram);
        logger.verbose(results.data[engram.urn]);
      }
    }
  }
}
