/**
 * auth.js
 * OBSOLETE
 * Home grown authentication, now using Passport.
 */
"use strict";

/**
 * basic HTTP authentication
 * Express middleware function
 */
exports.basic = function(request,response,next) {
  var credentials = parseAuthHeader(request);
  request.credentials = credentials;

  if ( !credentials.username || !credentials.password ) {
    response.
            status(401).
            set('WWW-Authenticate', 'Basic realm="' + config.realm + '"').
            send('Unauthorized');
  } else {
    next();
  }
};

/**
 * Parse the credentials from querystring or Authorization header field.
 * Authorization header takes precedence over querystring.
 * @param {Request} HTTP request
 * @return {Object} with username and password
 */
function parseAuthHeader(request){
  request = request.request || request;

  var credentials = {username:'', password:''};

  if ( request.query.username )
    credentials.username = request.query["username"];
  if ("password" in request.query)
    credentials.password = request.query["password"];

  var auth = request.headers.authorization;
  if (!auth)
    return credentials;

  // malformed
  var parts = auth.split(' ');
  if ('basic' != parts[0].toLowerCase())
    return credentials;
  if (!parts[1])
    return credentials;
  auth = parts[1];

  // credentials
  auth = Buffer.from(auth, 'base64').toString();
  auth = auth.match(/^([^:]*):(.*)$/);
  if (!auth)
    return credentials;

  return { username: auth[1], password: auth[2] };
}
