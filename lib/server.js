/**
 * server.js
 */
"use strict";

const http = require('http');

const config = require('./config');
const logger = require('./logger');
const app = require('./app');

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
 * Server class
 */
class Server {

  /**
   * server.start
   * @param {*} options
   */
  static start(options = null) {
    if (options === null)
      options = {};
    Object.assign(config, options);

    // Get port from environment and store in Express.
    config.appPort = Server._httpPort = normalizePort(config.serverPort || process.env.PORT || '8080');

    app.Configure(config);

    // Create HTTP server.
    Server._httpServer = http.createServer(app);

    // Listen on provided port, on all network interfaces.
    Server._httpServer.listen(Server._httpPort);
    Server._httpServer.on('error', onError);
    Server._httpServer.on('listening', onListening);

  }

}

Server._httpPort = config.appPort;
Server._httpServer = null;

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + Server._httpPort
    : 'Port ' + Server._httpPort;

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
  var addr = Server._httpServer.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  logger.info('Listening on ' + bind);
}

module.exports = Server;
