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

  // path to directory to contain upload and download folders
  dataPath: path.join(__dirname, '../data'),
  // path to web root with index.html, robots.txt, ...
  publicPath: path.join(__dirname, '../public'),
  // path to log files
  logPath: path.join(__dirname, '../log'),
  logLevel: 'info',

  // place holder for application defined routes
  routes: {
  },

  smt: {
    // storage node authentication
    $_accounts: 'elasticsearch|http:/localhost:9200|node_accounts|!userid',

    // application smt
  },

  // user authentication
  //authentication: '', // 'Basic', 'Digest', ...
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
  },

  // Codify
  // settings for Codify
  maxKeywordLength: 32,
  maxKeywordValues: 128,

  // use node route handlers
  node: {
    useStorage: true,
    useTransfer: true,
    useFileio: true
  },

  // fileio max upload size
  maxFileSize: 200 * 1024 * 1024, // 200MB

};

// development config
if (process.env.NODE_ENV === 'development') {

  config.serverPort = '8089';
  config.logLevel = 'verbose';
  config.smt.$_accounts = 'elasticsearch|http:/localhost:9200|node_accounts|!userid';

  config.smt.es_test_schema_0 = "elasticsearch|http://localhost:9200|foo_schema|*";
  config.smt.es_test_schema_1 = "elasticsearch|http://localhost:9200|foo_schema|!Foo";
  config.smt.es_test_schema_2 = "elasticsearch|http://localhost:9200|foo_schema|=Foo";
  config.smt.es_test_schema_u = "elasticsearch|http://localhost:9200|foo_schema|first";

  config.smt.es_test_transfer = "elasticsearch|http://localhost:9200|foo_transfer|=Foo";
  config.smt.es_test_transfer_2 = "elasticsearch|http://localhost:9200|foo_transfer_2|=Foo";
  config.smt.es_test_transfer_3 = "elasticsearch|http://localhost:9200|foo_transfer_3|=Foo";

  config.smt.mysql_test_schema_0 = "mysql|host=localhost;user=dicta;password=dicta;database=storage_node|foo_schema|*";
  config.smt.mysql_test_schema_1 = "mysql|host=localhost;user=dicta;password=dicta;database=storage_node|foo_schema|!Foo";
  config.smt.mysql_test_schema_2 = "mysql|host=localhost;user=dicta;password=dicta;database=storage_node|foo_schema|=Foo";

  config.smt.mysql_test_transfer_2 = "mysql|host=localhost;user=dicta;password=dicta;database=storage_node|foo_transfer|=Foo";

}

module.exports = config;
