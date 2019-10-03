/**
 * config.js
 */
"use strict";

const path = require('path');

var config = {
  // port for client connections
  serverPort: '80',

  // used for routes and prefixing storage container names, e.g. realm_accounts
  realm: 'node',

  // path to web root with index.html, robots.txt, ...
  publicPath: path.join(__dirname, '../public'),

  // path to directory to contain upload and download folders
  dataPath: path.join(__dirname, '../data'),

  // path to log files
  logPath: path.join(__dirname, '../log'),
  logLevel: 'info',

  // user authentication
  //authentication: '', // 'Basic', 'Digest', ...
  accounts_smt: 'elasticsearch|http:/localhost:9200|node_accounts|!userid',

  // HTTP session options
  useSessions: false,

  session_options(session_store) {
    return {
      name: 'company.com.sid',
      secret: ['company.com cookies'],
      cookie: {
        maxAge: 12*60*60*1000  // 12 hours
      },
      store: session_store,
      resave: false,
      saveUninitialized: false
    };
  },

  memorystore_options() {
    return {
      checkPeriod: 86400000, // prune expired entries every 24h
      stale: true
    };
  }

};

// development config
if (process.env.NODE_ENV === 'development') {

  config.serverPort = '8089';
  config.logLevel = 'verbose';
  config.accounts_smt = 'elasticsearch|http:/localhost:9200|node_accounts|!userid';
}

module.exports = config;
