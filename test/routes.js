/**
 * test/routes.js
 */
"use strict";

const express = require('express');
const url = require('url');
const logger = require('../lib/logger');
const authorize = require('../lib/authorize');
const roles = require('../lib/roles');

/**
 * routes
 */
var router = express.Router();
router.get('/echo', authorize([roles.User]), echo);
router.get('/echo/:param', authorize([roles.Admin]), echo);
router.get('/flasher', authorize([roles.Public]), flasher);
module.exports = router;


/**
 * /echo
 */
function echo(req, res) {
  logger.info('URI \'echo\' was called.');

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write(req.method + ' ' + req.url + ' HTTP/' + req.httpVersion + '\r\n');
  for (let header in req.headers) {
    res.write(header + ': ' + req.headers[header] + '\r\n');
  }

  res.write('\r\n----- url -----\r\n');
  var port = req.app.settings.port || 80;
  var requestUrl = req.protocol + '://' + req.host + (port == 80 || port == 443 ? '' : ':' + port) + req.originalUrl;

  let Url = new url.URL(requestUrl);
  for (let u in Url) {
    if (typeof (Url[u]) !== 'function' && typeof (Url[u]) !== 'object') {
      res.write(u + ': ' + Url[u] + '\r\n');
    }
  }

  res.write('\r\n----- querystring -----\r\n');
  for (let p in url.query) { res.write(p + ': ' + url.query[p] + '\r\n'); }

  res.write('\r\n----- req -----\r\n');
  for (let r in req) {
    if (typeof (req[r]) === 'function') {
      //
    } else if (typeof (req[r]) === 'object') {
      res.write(r + ':\r\n');
      let obj = req[r];
      for (let o in obj) {
        switch (typeof obj[o]) {
        case 'string':
        case 'number':
        case 'boolean':
          res.write('   ' + o + ': ' + obj[o] + '\r\n');
          break;
        default:
          res.write('   ' + o + ': ' + typeof obj[o] + '\r\n');
        }
      }
    } else { res.write(r + ': ' + req[r] + '\r\n'); }
  }

  res.end();
}

/**
 * /flasher
 */
function flasher(req, res) {
  logger.info('URI \'flash\' was called.');

  if (config.useSessions) {
    req.flash('info', 'Flash is back!');
    res.redirect('/status');
  } else {
    res.send('Sessions and Flash are not enabled.');
  }
}
