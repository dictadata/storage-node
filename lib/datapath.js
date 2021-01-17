/**
 * storage-node/datapath
 */
"use strict";

const logger = require('./logger');
const fs = require('fs/promises');
const path = require('path');

exports.startup = async (config) => {
  logger.info("datapath startup");
  let exitCode = 0;

  let dp = config.dataPath || path.join(__dirname, '../data');
  if (config.realm)
    dp = path.join(dp, '/', config.realm);

  logger.info("datapath: " + dp);

  await fs.mkdir(dp + '/uploads', { recursive: true }, (err) => {
    if (err) {
      logger.warn(err.message);
      exitCode = 2;
    }
  });
  await fs.mkdir(dp + '/downloads', { recursive: true }, (err) => {
    if (err) {
      logger.warn(err.message);
      exitCode = 2;
    }
  });

  return exitCode;
};
