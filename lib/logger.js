/**
 * storage-node/logger
 */
"use strict";

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const _level = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
  level: _level,
  format: winston.format.timestamp(),
  transports: [
  ]
});

module.exports = exports = logger;

// development logging to console
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({ format: winston.format.cli() }));
  logger.add(new winston.transports.Console({ format: winston.format.errors({ stack: true }), level: 'error' }));
}
else {
  // suppress logger from throwing exceptions
  logger.emitErrs = false;
}

var defaultOptions = {
  logPath: "./logs",
  prefix: "node"
};

logger.configLogger = function (options) {
  options = Object.assign({}, defaultOptions, options);

  logger.level = process.env.LOG_LEVEL || options.logLevel || 'info';

  logger.add( new DailyRotateFile({
    format: winston.format.logstash(),
    dirname: options.logPath,
    filename: options.realm + '-app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '100m',
    maxFiles: (process.env.NODE_ENV === 'development') ? '1d' : '31d'
  }) );

  logger.add( new DailyRotateFile({
    level: 'error' ,
    format: winston.format.errors(),
    dirname: options.logPath,
    filename: options.realm + '-error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '100m',
    maxFiles: (process.env.NODE_ENV === 'development') ? '1d' : '31d'
  }) );
};
