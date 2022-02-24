/**
 * config.js
 */
"use strict";

const fs = require('fs');
const path = require('path');
const Package = require('../../package.json');
const { typeOf } = require("@dictadata/storage-junctions/utils");

var _config = {
  name: Package.name,
  version: Package.version,

  // port for client connections
  serverPort: '8080',
  // used for routes and prefixing storage container names, e.g. realm_accounts
  realm: 'node-api',

  // path to log files
  logPath: path.join('./log/storage-node'),
  logPrefix: 'node-api',
  logLevel: process.env.LOG_LEVEL || 'info',

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

  codex: {
    smt: "memory|dictadata|codex|!name"
  },

  // storage-node API authentication
  $_accounts: "elasticsearch|http://localhost:9200|node_accounts|!userid",
  //$_accounts: "mssql|server=localhost;username=dicta;password=data;database=storage_node|node_accounts|=userid",
  //$_accounts: "mysql|host=localhost;user=dicta;password=data;database=storage_node|node_accounts|=userid",

  // smt entries to be added to codex at startup
  smt: {
    // application SMT's
    // format
    //   <name>: <smt string>
    //   <name>: {
    //     smt: <smt string> | <smt object>,
    //     encoding: "<filename.encoding.json>" | {...}
    //   }
  },

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

  // enable node-api route handlers
  "node-api": {
    useStorage: true,
    useTransfer: true,
    useClientStream: false,  // TBD not fully implemented
    useTransport: false   // TBD not fully implemented
  },

  // clientStream max upload size
  maxFileSize: 200 * 1024 * 1024, // 200MB

  // CORS options for Express plugin
  cors: {
    allowedHeaders: [ 'Origin', 'X-Requested-With', 'Content-Type', 'Accept' ]
  }
};

module.exports = _config;

_config.init = () => {
  try {
    // read config file from working directory
    let text = fs.readFileSync("storage-node.config.json", 'utf-8');
    let cfg = JSON.parse(text);
    _copy(_config, cfg);
  }
  catch (err) {
    console.verbose(err.message);
  }
};

/**
 * Copy all src properties to dst object.
 * Deep copy of object properties and top level arrays.
 * Shallow copy of reference types like Date, sub-arrays, etc.
 * Does not copy functions.
 * Note, recursive function.
 * @param {object} dst
 * @param {object} src
 */
function _copy(dst, src) {
  for (let [ key, value ] of Object.entries(src)) {
    if (typeOf(value) === "object") { // fields, ...
      dst[ key ] = {};
      _copy(dst[ key ], value);
    }
    else if (typeOf(value) === "array") {
      dst[ key ] = [];
      for (let item of value)
        if (typeOf(item) === "object")
          dst[ key ].push(_copy({}, item));
        else
          dst[ key ].push(item);
    }
    else if (typeOf(value) !== "function") {
      dst[ key ] = value;
    }
  }
  return dst;
}
