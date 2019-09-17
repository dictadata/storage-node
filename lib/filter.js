/**
 * server/filter.js
 */
"use strict";

const path = require("path");

/**
 * filter HTTP requests
 * Express middleware function
 */
exports.datacheck = function(request,response,next) {

  if ( request.get("api") == null && path.extname(request.path) == '.json' ) {
    // so IE can display json strings
    response.set('Content-Type', 'text/plain');
  }
  next();
};
