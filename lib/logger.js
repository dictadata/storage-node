/**
 * storage-node/logger
 */
"use strict";

const winston = require('winston');

const _level = process.env.LOG_LEVEL || 'info';

// server.startup will add transports
const logger = winston.createLogger({
  level: _level,
  format: winston.format.timestamp(),
  transports: [
  ]
});

// development logging to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.cli()
  }));
}

module.exports = logger;
