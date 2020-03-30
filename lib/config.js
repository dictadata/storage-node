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
  logPath: path.join('/var/log/node'),
  logLevel: 'info',

  // place holder for application defined routes
  routes: {
  },

  smt: {
    // storage node authentication
    $_accounts: 'elasticsearch|http:/localhost:9200|node_accounts|!userid',

    // application smt
  },

  // default Passport.js authentication strategy
  auth_strategy: 'basic', // 'local', 'basic', 'digest'

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

  // CORS options for Express plugin
  cors: {
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept']
  }
};

// development config
if (process.env.NODE_ENV === 'development') {

  config.serverPort = '8089';

  // path to log files
  config.logPath = path.join(__dirname, '../log'),
  config.logLevel = 'verbose';

  config.smt.$_accounts = 'elasticsearch|http:/localhost:9200|node_accounts|!userid';
  config.smt.accounts = 'elasticsearch|http:/localhost:9200|node_accounts|!userid';

  config.smt["csv_foofile"] = "csv|./test/data/|foofile.csv|*";

  config.smt.es_foo_schema    = "elasticsearch|http://localhost:9200|foo_schema|!";
  config.smt.es_foo_schema_ks = "elasticsearch|http://localhost:9200|foo_schema|!Foo";
  config.smt.es_foo_schema_pk = "elasticsearch|http://localhost:9200|foo_schema|=Foo";
  config.smt.es_foo_schema_id = "elasticsearch|http://localhost:9200|foo_schema|first";

  config.smt.es_foo_transfer   = "elasticsearch|http://localhost:9200|foo_transfer|=Foo";
  config.smt.es_foo_transfer_2 = "elasticsearch|http://localhost:9200|foo_transfer_2|=Foo";
  config.smt.es_foo_transfer_3 = "elasticsearch|http://localhost:9200|foo_transfer_3|=Foo";

  config.smt.mysql_foo_schema    = "mysql|host=localhost;user=dicta;password=dicta;database=storage_node|foo_schema|*";
  config.smt.mysql_foo_schema_pk = "mysql|host=localhost;user=dicta;password=dicta;database=storage_node|foo_schema|=Foo";

  config.smt.mysql_foo_transfer  = "mysql|host=localhost;user=dicta;password=dicta;database=storage_node|foo_transfer|=Foo";
  config.smt.mysql_foo_transfer_2  = "mysql|host=localhost;user=dicta;password=dicta;database=storage_node|foo_transfer_2|=Foo";
  config.smt.mysql_foo_transfer_3  = "mysql|host=localhost;user=dicta;password=dicta;database=storage_node|foo_transfer_3|=Foo";

  config.smt["rest_weather_forecast"] = "rest|https://api.weather.gov/gridpoints/DVN/34,71/|forecast|=*";
  config.smt["mysql_rest_forecast"] = "mysql|host=localhost;user=dicta;password=dicta;database=storage_node|rest_forecast|=*";

}

module.exports = config;
