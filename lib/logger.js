/**
 * logger.js
 */
"use strict";

const winston = require('winston');

const _level = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
  level: _level,
  format: winston.format.json(),
  transports: [
  ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
