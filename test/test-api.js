/**
 * test/myroutes.js
 */
"use strict";

const express = require("express");
const url = require('url');
const { logger } = require('@dictadata/lib')
const authorize = require('../storage/node/authorize');
const Roles = require('../storage/node/roles');

/**
 * routes
 */
var router = express.Router();
router.get('/echo', authorize([Roles.Public]), echo);
router.get('/echo/:param', authorize([Roles.User]), echo);
router.post('/echo', authorize([Roles.Public]), echo);
router.post('/echo/:param', authorize([Roles.User]), echo);
module.exports = exports = router;


/**
 * /echo
 */
function echo(req, res) {
  logger.verbose('/echo');

  res.status(200).set('content-type', 'text/plain');
  let body =  "";

  body +=  req.method + ' ' + req.url + ' HTTP/' + req.httpVersion + '\r\n';
  for (let header in req.headers) {
    body +=  header + ': ' + req.headers[header] + '\r\n';
  }

  body +=  '\r\n----- url -----\r\n';
  var port = req.app.settings.port || 80;
  var requestUrl = req.protocol + '://' + req.hostname + (port == 80 || port == 443 ? '' : ':' + port) + req.originalUrl  + '\r\n';

  let Url = new url.URL(requestUrl);
  for (let u in Url) {
    if (typeof (Url[u]) !== 'function' && typeof (Url[u]) !== 'object') {
      body +=  u + ': ' + Url[u] + '\r\n';
    }
  }

  body +=  '\r\n----- querystring -----\r\n';
  for (let p in url.query) { body +=  p + ': ' + url.query[p] + '\r\n'; }

  body +=  '\r\n----- req -----\r\n';
  for (let r in req) {
    if (typeof (req[r]) === 'function') {
      //
    } else if (typeof (req[r]) === 'object') {
      body +=  r + ':\r\n';
      let obj = req[r];
      for (let o in obj) {
        switch (typeof obj[o]) {
        case 'string':
        case 'number':
        case 'boolean':
          body +=  '   ' + o + ': ' + obj[o] + '\r\n';
          break;
        default:
          body +=  '   ' + o + ': ' + typeof obj[o] + '\r\n';
        }
      }
    } else { body +=  r + ': ' + req[r] + '\r\n'; }
  }

  res.send(body);
}
