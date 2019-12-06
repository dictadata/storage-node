/**
 * server.js
 */
"use strict";

const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./logger');
const startup = require('./startup');
const authenticate = require('./authenticate');
const datapath = require('./datapath');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

var httpPort = config.serverPort;
var httpServer = null;

startup.add(authenticate.startup);
startup.add(datapath.startup);

/**
 * server.start
 * @param {*} options
 */
exports.start = async function (options = null) {

  if (options === null) options = {};
  Object.assign(config, options);

  logger.level = process.env.LOG_LEVEL || config.logLevel || 'info';

  logger.add( new DailyRotateFile({
    format: winston.format.logstash(),
    dirname: config.logPath,
    filename: config.realm + '-app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '100m',
    maxFiles: '7d'
  }) );
  /*
  logger.add( new DailyRotateFile({
    level: 'error' ,
    format: winston.format.errors(),
    dirname: config.logPath,
    filename: config.realm + '-error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '100m',
    maxFiles: '31d',
    auditFile: path.join(config.logPath, config.realm + '-error-auditlog.json')
  }) );
  */
  logger.verbose("server startup...");
  logger.verbose("logPath: " + config.logPath);

  // initialize some things now that the config is updated
  //await authenticate.startup(config);
  //await datapath.startup(config);
  for (let func of startup.list) {
    await func(config);
  }
  app.startup(config);

  // Get port from environment and store in Express.
  httpPort = normalizePort(process.env.PORT || config.serverPort || '8080');

  // Create HTTP server.
  httpServer = http.createServer(app);

  // Listen on provided port, on all network interfaces.
  httpServer.listen(httpPort);
  httpServer.on('error', onError);
  httpServer.on('listening', onListening);

  logger.verbose("server started.");
};

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = (typeof httpPort === 'string') ? 'Pipe ' + httpPort : 'Port ' + httpPort;

  // handle specific listen errors with friendly messages
  switch (error.code) {
  case 'EACCES':
    throw new Error(bind + ' requires elevated privileges');
  case 'EADDRINUSE':
    throw new Error(bind + ' is already in use');
  default:
    throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  var addr = httpServer.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  logger.info('Listening on ' + bind);
}
