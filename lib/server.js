/**
 * server.js
 */
"use strict";

const http = require('http');
const app = require('./app');
const authenticate = require('./authenticate');
const datapath = require('./datapath');
const config = require('./config');
const logger = require('./logger');
const winston = require('winston');
const path = require('path');

var httpPort = config.serverPort;
var httpServer = null;
var startupFuncs = [];

exports.addStartup = function (finit) {
  startupFuncs.push(finit);
};

/**
 * server.start
 * @param {*} options
 */
exports.start = async function (options = null) {

  if (options === null) options = {};
  Object.assign(config, options);

  console.log("logPath: " + config.logPath);
  logger.add(new winston.transports.File({ filename: path.join(config.logPath, config.realm + '.log') }) );
  logger.add(new winston.transports.File({ filename: path.join(config.logPath, config.realm + '_error.log'), level: 'error' }) );

  logger.verbose("server startup...");

  // initialize some things now that the config is updated
  await authenticate.startup(config);
  await datapath.startup(config);
  for (let func of startupFuncs) {
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
