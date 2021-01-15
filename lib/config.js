/**
 * config.js
 */
"use strict";

const path = require('path');
const Package = require('../package.json');

var config = {
  name: Package.name,
  version: Package.version,

  // port for client connections
  serverPort: '8080',
  // used for routes and prefixing storage container names, e.g. realm_accounts
  realm: 'node-api',

  // path to log files
  logPath: path.join('/var/log/storage-node'),
  logPrefix: 'node-api',
  logLevel: 'info',

  // path to web root with index.html, robots.txt, ...
  publicPath: path.join(__dirname, '../public'),
  // path to directory to contain upload and download folders
  dataPath: path.join(__dirname, '../data'),

  // place holder for application defined routes
  routes: {
  },

  // define additional authorization roles
  roles: {
  },

  // production routes
  smt: {
    // storage-node API authentication
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
  "node-api": {
    useStorage: true,
    useTransfer: true,
    useClientStream: false,  // not fully implemented
    useTransport: false   // not fully implemented
  },

  // clientStream max upload size
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

  config["node-api"].useClientStream = true;
  config["node-api"].useTransport = true;

  config.smt.$_accounts = 'elasticsearch|http:/localhost:9200|node_accounts|!userid';
  config.smt.accounts = 'elasticsearch|http:/localhost:9200|node_accounts|!userid';

  config.smt["csv_foofile"] = "csv|./test/data/|foofile.csv|*";
  config.smt["json_foofile"] = "json|./test/data/|foofile.json|*";

  config.smt.es_foo_schema    = "elasticsearch|http://localhost:9200|foo_schema|*";
  config.smt.es_foo_schema_ks = "elasticsearch|http://localhost:9200|foo_schema|!";
  config.smt.es_foo_schema_kf = "elasticsearch|http://localhost:9200|foo_schema|!Foo";
  config.smt.es_foo_schema_pk = "elasticsearch|http://localhost:9200|foo_schema|=Foo";
  config.smt.es_foo_schema_id = "elasticsearch|http://localhost:9200|foo_schema|twenty";

  config.smt.es_foo_transfer  = "elasticsearch|http://localhost:9200|foo_transfer|=Foo";
  config.smt.es_foo_transform = "elasticsearch|http://localhost:9200|foo_transform|=Foo";

  config.smt.mssql_foo_schema    = "mssql|server=localhost;username=dicta;password=data;database=storage_node|foo_schema|*";
  config.smt.mssql_foo_schema_pk = "mssql|server=localhost;username=dicta;password=data;database=storage_node|foo_schema|=Foo";

  config.smt.mssql_foo_transfer  = "mssql|server=localhost;username=dicta;password=data;database=storage_node|foo_transfer|=Foo";
  config.smt.mssql_foo_transform = "mssql|server=localhost;username=dicta;password=data;database=storage_node|foo_transform|=Foo";

  config.smt.mysql_foo_schema    = "mysql|host=localhost;user=dicta;password=data;database=storage_node|foo_schema|*";
  config.smt.mysql_foo_schema_pk = "mysql|host=localhost;user=dicta;password=data;database=storage_node|foo_schema|=Foo";

  config.smt.mysql_foo_transfer  = "mysql|host=localhost;user=dicta;password=data;database=storage_node|foo_transfer|=Foo";
  config.smt.mysql_foo_transform = "mysql|host=localhost;user=dicta;password=data;database=storage_node|foo_transform|=Foo";

  config.smt["rest_weather_forecast"] = "rest|https://api.weather.gov/gridpoints/DVN/34,71/|forecast|*";
  config.smt["es_weather_forecast"] = "elasticsearch|http://localhost:9200|weather_forecast|*";
  config.smt["mssql_weather_forecast"] = "mssql|server=localhost;username=dicta;password=data;database=storage_node|weather_forecast|*";
  config.smt["mysql_weather_forecast"] = "mysql|host=localhost;user=dicta;password=data;database=storage_node|weather_forecast|*";
}

module.exports = config;
