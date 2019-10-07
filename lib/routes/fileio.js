/**
 * storage-node/upload
 */
"use strict";

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const config = require('../config');
const logger = require('../logger');
const formidable = require('formidable');
const util = require('util');

/**
 * upload routes
 */
var router = express.Router();
router.put('/upload', authorize([roles.ETL, roles.Admin]), fileUpload);
router.get('/download/:filename', authorize([roles.ETL, roles.Admin]), fileDownload);
module.exports = router;

function fileUpload (req, res) {
  logger.verbose('/fileio fileUpload');

  let dp = config.dataPath || (__dirname + '../data');
  if (config.realm)
    dp += '/' + config.realm;

  var fm = new formidable.IncomingForm();
  fm.encoding = 'utf-8';
  fm.uploadDir = dp + "/uploads";
  fm.keepExtensions = true;
  fm.maxFileSize = config.maxFileSize || 200 * 1024 * 1024; // 200MB
  fm.multiples = true;

  fm.parse(req, function(err, fields, files) {
    res.writeHead(200, {'content-type': 'text/plain'});

    res.write('received upload:\n\n');

    res.end(util.inspect({fields: fields, files: files},{depth:3}));
  });
}

function fileDownload(req, res) {
  logger.verbose('/fileio fileDownload');
  res.writeHead(200, { 'content-type': 'text/plain' });

  let dp = config.dataPath || (__dirname + '../data');
  if (config.realm)
    dp += '/' + config.realm;

  let filename = req.params["filename"];

  res.sendfile( dp + "/" + filename);

  res.end();
}
