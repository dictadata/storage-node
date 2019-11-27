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
const logger = require('./logger');

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
const routes = require("./routes");

// the server app
var app = express();
module.exports = app;
app.passport = passport;

app.startup = function(config) {
  logger.verbose("app startup");

  if (app.get('env') === 'development')
    app.set('json spaces', 2);  // pretty output

  // HTTP message processing
  app.use(cors());
  app.use(compression({ threshold: 2048 }));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({ type: 'application/json' }));

  if (config.useSessions) {
    let session_options = config.session_options(
      new MemoryStore(config.memorystore_options())
    );
    if (app.get('env') === 'production') {
      app.set('trust proxy', 1);  // trust first proxy
      session_options.cookie.secure = false;  // serve secure cookies
    }

    app.use(cookieParser(session_options.secret));
    app.use(session(session_options));
  }

  // log all requests to log file
  let allstream = rfs(config.realm + '-request.log', {
    path: config.logPath,
    interval: '1d',
    size: '100M'
  });
  app.use( morgan('combined', {stream: allstream }) );

  if (app.get('env') !== 'production') {
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
    const err = new Error('Not Found ' + req.originalUrl);
    err.status = 404;
    next(err);
  });

  // error handler
  app.use(function(err, req, res, _next) {
    logger.warn(err.message);

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render custom error page
    res.status(err.status || 500).set("Content-Type", "text/plain").send(err.message);
  });

};
