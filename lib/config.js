/**
 * config.js
 */
"use strict";

const path = require('path');

var settings = {
  // used for routes and prefixing storage container names, e.g. realm_accounts
  realm: 'api',

  // port for client connections
  serverPort: '80',

  // path to log files
  logPath: path.join(__dirname, '../log'),

  // path to web root with index.html, robots.txt, ...
  publicPath: path.join(__dirname, '../public'),

  // user authentication
  //authentication: '', // 'Basic', 'Digest', ...
  accounts_smt: 'elasticsearch|http:/localhost:9200|api_accounts|=userid',

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

// development settings
if (process.env.NODE_ENV === 'development') {

  settings.serverPort = '8089';
  settings.accounts_smt = 'elasticsearch|http:/localhost:9200|api_accounts|=userid';

}

module.exports = settings;
