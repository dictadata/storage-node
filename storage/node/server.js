/**
 * server.js
 */
"use strict";

const app = require('./app');
const config = require('./config');
const logger = require('../utils/logger');
const startup = require('./startup');
const engrams = require('./engrams');
const accounts = require('./accounts');
const datapath = require('./datapath');
const tracts = require('./tracts');
const { StorageError } = require("@dictadata/storage-junctions/types");

const http = require('node:http');

var httpPort = 0;
var httpServer = null;

// modules startup
startup.add(engrams.startup);
startup.add(accounts.startup);
startup.add(datapath.startup);
startup.add(tracts.startup);
// app.startup is last
startup.add(app.startup);

/**
 * server.start
 * @param {*} options
 */
exports.start = async function (options) {
  await config.init(options);

  logger.configNodeLogger(config);
  logger.info("storage-node startup ...");
  logger.info("realm: " + config.realm);
  logger.verbose("logPath: " + config.logPath);

  // initialize modules now that the config is updated
  let exitCode = await startup.exec(config);
  if (exitCode !== 0) {
    process.exitCode = exitCode;
    return;
  }

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
      throw new StorageError(401, bind + ' requires elevated privileges');
    case 'EADDRINUSE':
      throw new StorageError(409, bind + ' is already in use');
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

// Process signal events
// https://nodejs.org/api/process.html#process_signal_events

process.on('SIGINT', () => {
  // user pressed Ctrl-C
  // TBD call any shutdown functions
  logger.warn('Process Interrupt Ctrl-C');
  process.exitCode = 1;
});

process.on('SIGBREAK', () => {
  // user pressed Ctrl-Break on Windows
  // TBD call any shutdown functions
  logger.warn('Process Interrupt Ctrl-Break');
  process.exitCode = 1;
});
