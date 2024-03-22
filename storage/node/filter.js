/**
 * server/filter.js
 */
"use strict";

const path = require('node:path');

/**
 * filter HTTP requests
 * Express middleware function
 */
exports.jsoncheck = function(request,response,next) {

  if ( path.extname(request.path) == '.json' ) {
    // so IE can display json strings
    response.set('Content-Type', 'text/plain');
  }
  next();
};
