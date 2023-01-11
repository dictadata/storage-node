/**
 * test/myroutes.js
 */
"use strict";

const express = require('express');
const url = require('url');
const logger = require('../storage/utils/logger');
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
router.get('/flasher', authorize([Roles.Public]), flasher);
module.exports = router;


/**
 * /echo
 */
function echo(req, res) {
  logger.verbose('/echo');

  res.status(200).set('content-type', 'text/plain');
  res.send(req.method + ' ' + req.url + ' HTTP/' + req.httpVersion + '\r\n');
  for (let header in req.headers) {
    res.send(header + ': ' + req.headers[header] + '\r\n');
  }

  res.send('\r\n----- url -----\r\n');
  var port = req.app.settings.port || 80;
  var requestUrl = req.protocol + '://' + req.hostname + (port == 80 || port == 443 ? '' : ':' + port) + req.originalUrl;

  let Url = new url.URL(requestUrl);
  for (let u in Url) {
    if (typeof (Url[u]) !== 'function' && typeof (Url[u]) !== 'object') {
      res.send(u + ': ' + Url[u] + '\r\n');
    }
  }

  res.send('\r\n----- querystring -----\r\n');
  for (let p in url.query) { res.send(p + ': ' + url.query[p] + '\r\n'); }

  res.send('\r\n----- req -----\r\n');
  for (let r in req) {
    if (typeof (req[r]) === 'function') {
      //
    } else if (typeof (req[r]) === 'object') {
      res.send(r + ':\r\n');
      let obj = req[r];
      for (let o in obj) {
        switch (typeof obj[o]) {
        case 'string':
        case 'number':
        case 'boolean':
          res.send('   ' + o + ': ' + obj[o] + '\r\n');
          break;
        default:
          res.send('   ' + o + ': ' + typeof obj[o] + '\r\n');
        }
      }
    } else { res.send(r + ': ' + req[r] + '\r\n'); }
  }

  res.end();
}

/**
 * /flasher
 */
function flasher(req, res) {
  logger.verbose('/flash');

  if (config.useSessions) {
    req.flash('info', 'Flash is back!');
    res.redirect('/status');
  } else {
    res.send('Sessions and Flash are not enabled.');
  }
}
