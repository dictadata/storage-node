/**
 * storage/node/config
 */
"use strict";

const Package = require('../../package.json');
const { typeOf, objCopy } = require("@dictadata/lib");

const { readFile } = require('node:fs/promises');
const path = require('node:path');

const homedir = process.env[ "HOMEPATH" ] || require('os').homedir();

var _config = {
  name: Package.name,
  version: Package.version,

  // port for client connections
  serverPort: '8080',
  // used for HTTP authentication realm, data directory, and log prefix
  realm: 'node-api',

  // path to log files
  logPath: path.join('./log/storage-node'),
  logPrefix: 'node-api',
  logLevel: process.env.LOG_LEVEL || 'info',
  logNoConsole: true,

  // path to web root with index.html, robots.txt, ...
  publicPath: path.join(__dirname, '../../public'),
  // path to directory to contain upload and download folders
  dataPath: path.join(__dirname, '../../data'),

  // application defined routes
  routes: {
  },

  // application defined authorization roles
  roles: {
  },

  // storage-node API authentication
  $_accounts: "elasticsearch|http://localhost:9200|node_accounts|!userid",
  //$_accounts: "mysql|host=localhost;database=storage_node|node_accounts|=userid",

  // default Passport.js authentication strategy
  auth_strategy: 'basic', // 'local', 'basic', 'digest'

  // HTTP session options
  useSessions: false,

  session_options: {
    name: 'company.com.sid',
    secret: [ 'company.com cookies' ],
    cookie: {
      maxAge: 12 * 60 * 60 * 1000  // 12 hours
    },
    store: null,
    resave: false,
    saveUninitialized: false
  },

  memorystore_options: {
    checkPeriod: 86400000, // prune expired entries every 24h
    stale: true
  },

  // Codify settings
  maxKeywordLength: 32,
  maxKeywordValues: 128,

  // webdata max upload size
  maxFileSize: 200 * 1024 * 1024, // 200MB

  // CORS options for Express plugin
  cors: {
    origin: "*",
    methods: 'GET,PUT,POST,DELETE',
    allowedHeaders: [ 'Authorization', 'Content-Type' ],
    credentials: true
  },
  engrams: {
    smt: "memory|dictadata|engrams|*",
    options: {},

    // at startup, these entries will be added to engrams local cache
    engrams_cache: {
      // format
      //   <name>: <smt string>
      // or
      //   <name>: {
      //     smt: <smt string> | <smt object>,
      //     options: {
      //       <junction options ...>
      //     }
      //   }
    }

  },

  tracts: {
    smt: "memory|dictadata|tracts|*",
    options: {},

    // at startup, these entries will be added to tracts local cache
    tracts_cache: {
      // format
      //   <name>: {
      //     smt: <smt string> | <smt object>,
      //     options: {
      //       <junction options ...>
      //     }
      //   }
    }

  }

};

module.exports = exports = _config;

_config.init = async (options) => {
  try {
    // read config file from working directory
    let config_file = "storage-node.config.json";
    console.log("reading " + config_file);
    let config_obj = JSON.parse(await readFile(config_file, 'utf-8'));
    objCopy(_config, config_obj);

    // read config file from user directory
    try {
      let user_file = homedir + "/.dictadata/storage-node.config.json";
      console.log("reading " + user_file);
      let user_config = JSON.parse(await readFile(user_file, 'utf-8'));
      objCopy(_config, user_config);
    }
    catch (error) {
      console.error(error.message);
    }

    // add options to config
    if (options) {
      objCopy(_config, options);

      // routes as objects
      if (Object.hasOwn(options, 'routes')) {
        for (let [ route, router ] of Object.entries(options.routes))
          _config.routes[ route ] = router;
      }

      // cors origin array as regexp
      if (Array.isArray(_config.cors?.origin)) {
        for (let i = 0; i < _config.cors.origin.length; i++) {
          _config.cors.origin[ i ] = new RegExp(_config.cors.origin[ i ]);
        }
      }
    }
  }
  catch (err) {
    console.error(err.message);
  }
};
