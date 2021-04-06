/**
 * server/app.js
 */
"use strict";

// module imports
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const flash = require('connect-flash');
const morgan = require('morgan');
const path = require('path');
const rfs = require('rotating-file-stream');
const { StorageError } = require("@dictadata/storage-junctions").types;
const logger = require('../utils/logger');

// Express middleware
// authentication
//const auth = require('./auth');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const BasicStrategy = require('passport-http').BasicStrategy;
const DigestStrategy = require('passport-http').DigestStrategy;
const authenticate = require('./authenticate');

// security
//const filter = require('./filter');
const security = require('./security');
const seo = require('./seo');

// request routing
const routes = require("./node-api");

// the server app
var app = express();
module.exports = exports = app;
app.passport = passport;

app.startup = function(config) {
  logger.info("app startup");
  let exitCode = 0;

  if (process.env.NODE_ENV === 'development') {
    app.set('json spaces', 2);  // pretty output
  }

  if (process.env.NODE_ENV !== 'development') {
    app.set('trust proxy', 'loopback');
  }

  // HTTP message processing
  app.options('*', cors());  // enable pre-flight across-the-board
  app.use( cors(config && config.cors) );

  app.use(compression({ threshold: 2048 }));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({ type: 'application/json' }));

  if (config.useSessions) {
    let session_options = config.session_options(
      new MemoryStore(config.memorystore_options())
    );
    if (process.env.NODE_ENV !== 'development') {
      session_options.cookie.secure = false;  // serve secure cookies
    }

    app.use(cookieParser(session_options.secret));
    app.use(session(session_options));
  }

  // log all requests to log file
  const pad = (num) => (num > 9 ? "" : "0") + num;
  let filenameGenerator = (time, index) => {
    if (!time)
      return config.realm + '-http.log';

    var year = time.getFullYear();
    var month = pad(time.getMonth() + 1);
    var day = pad(time.getDate());
    var hour = pad(time.getHours());
    var minute = pad(time.getMinutes());

    return config.realm + '-http-' + `${year}-${month}-${day}-${index}.log`;
  };

  let allstream = rfs.createStream(filenameGenerator, {
    path: config.logPath,
    interval: '1d',
    size: '100M'
  });
  app.use( morgan('combined', {stream: allstream }) );

  if (process.env.NODE_ENV === 'development') {
    // log all requests to console
    app.use( morgan('short', { stream: process.stdout }) );
  }

  // route middleware
  //app.all('/data/*', filter.jsoncheck);
  app.all(security);
  app.all(seo);
  //app.all(auth);  // old HTTP authentication

  // passport authentication
  app.use(passport.initialize());
  passport.use(new LocalStrategy(authenticate.local));
  passport.use(new BasicStrategy( {realm: config.realm}, authenticate.basic ));
  passport.use(new DigestStrategy( {realm: config.realm}, authenticate.digest, authenticate.digest_validate ));

  if (config.useSessions) {
    app.use(passport.session());
    app.use(flash());
  }

  // static file handler, place before authentication
  var _publicPath = config.publicPath;
  app.use(express.static(_publicPath));
  app.use(favicon(path.join(_publicPath, 'favicon.ico')));
  logger.info("publicPath: " + _publicPath);

  // all other requests go through authentication
  if (config.auth_strategy)
    app.use('/*', passport.authenticate(config.auth_strategy, { session: config.useSessions }));

  // default node route handlers
  app.use('/node', routes);

  // add application defined route handlers
  for (let [route,router] of Object.entries(config.routes)) {
    logger.info('Adding route: ' + route);
    app.use(route, router);
  }

  // old way of defining route handlers
  if (config.router) {
    let rpath = config.routerPath || '/';
    logger.info('Adding route: ' + rpath);
    app.use(rpath, config.router);
  }

  // default Not Found handler
  // generate 404 error, forward to error handler
  app.use(function(req, res, next) {
    const err = new StorageError(404, 'Not Found ' + req.originalUrl);
    next(err);
  });

  // error handler
  app.use(function(err, req, res, _next) {
    logger.warn(err.message);

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV === 'development' ? err : {};

    // render custom error page
    res.status(err.statusCode || 500).set("Content-Type", "text/plain").send(err.message);
  });

  return exitCode;
};
