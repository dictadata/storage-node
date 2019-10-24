/**
 * storage-node/datapath
 */
"use strict";

const logger = require('./logger');
const fs = require('fs');
const path = require('path');

exports.startup = async (config) => {
  logger.verbose("datapath startup");

  let dp = config.dataPath || path.join(__dirname, '../data');
  if (config.realm)
    dp = path.join(dp, '/', config.realm);

  logger.info("datapath: " + dp);

  fs.mkdir(dp + '/uploads', { recursive: true }, (err) => {
    if (err) {
      logger.warn(err.message);
      throw err;
    }
  });
  fs.mkdir(dp + '/downloads', { recursive: true }, (err) => {
    if (err) {
      logger.warn(err.message);
      throw err;
    }
  });
};
