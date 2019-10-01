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
const logger = require('./logger');

// Express middleware
const passport = require('passport');
//const LocalStrategy = require('passport-local').Strategy;
const HttpStrategy = require('passport-http').BasicStrategy;
const authenticate = require('./authenticate');

//const filter = require('./filter');
const security = require('./security');
const seo = require('./seo');
//const auth = require('./auth');

const routes = require("./routes");

// the server app
var app = express();

module.exports = app;

app.Configure = function(config) {

  if (app.get('env') === 'development')
    app.set('json spaces', 2);  // pretty output

  app.set('port', config.appPort);

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

  // statusCode < 400 log to stdout
  app.use(morgan('dev', {
    skip: function (req, res) {
      return res.statusCode >= 400;
    }, stream: process.stdout
  }));
  // statusCode >= 400 log to stderr
  app.use(morgan('dev', {
    skip: function (req, res) {
      return res.statusCode < 400;
    }, stream: process.stderr
  }));

  // route middleware
  //app.all('/data/*', filter.jsoncheck);
  app.all(security);
  app.all(seo);
  //app.all(auth);  // old HTTP authentication

  // passport strategies
  app.use(passport.initialize());
  //  passport.use(new LocalStrategy(authenticate.local));
  if (app.get('env') === 'production')
    passport.use(new HttpStrategy( {realm: config.realm}, authenticate.http ));
  else
    passport.use(new HttpStrategy( {realm: config.realm}, authenticate.http ));
    //passport.use(new HttpStrategy( {realm: config.realm}, authenticate.local ));

  if (config.useSessions) {
    app.use(passport.session());
    app.use(flash());
  }

  // static file handler, place before authentication
  var _publicPath = config.publicPath;
  //console.log(_publicPath);
  app.use(express.static(_publicPath));
  app.use(favicon(path.join(_publicPath, 'favicon.ico')));

  // all other requests go through authentication
  app.use('/*', passport.authenticate('basic', { session: config.useSessions }));

  // default node route handlers
  app.use('/node', routes);

  // application define route handlers
  if (config.router) {
    let rpath = config.routerPath || '/';
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
    logger.info(err.message);

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render custom error page
    res.writeHead(err.status || 500, { "Content-Type": "text/plain" });
    res.write(err.message);
    res.end();
  });

};
