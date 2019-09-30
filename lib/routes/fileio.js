/**
 * node/upload
 */
"use strict";

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const config = require('../config');
const logger = require('../logger');
const formidable = require('formidable');
const util = require('util');
const fs = require('fs');

/**
 * upload routes
 */
var router = express.Router();
router.put('/upload', authorize([roles.ETL, roles.Admin]), fileUpload);
router.get('/download/:filename', authorize([roles.ETL, roles.Admin]), fileDownload);
module.exports = router;

(function createdirs(){
  let dp = config.dataPath || (__dirname + '../data');
  if (config.realm)
    dp += '/' + config.realm;

  fs.mkdir( dp + '/uploads', { recursive: true }, err => {
    if (err) throw err;
  });
  fs.mkdir( dp + '/downloads', { recursive: true }, err => {
    if (err) throw err;
  });

})();

function fileUpload (req, res) {
  logger.info('URI \'POST \' was called.');

  let dp = config.dataPath || (__dirname + '../data');
  if (config.realm)
    dp += '/' + config.realm;

  var fm = new formidable.IncomingForm();
  fm.encoding = 'utf-8';
  fm.uploadDir = dp + "/uploads";
  fm.keepExtensions = true;
  fm.maxFileSize = 200 * 1024 * 1024; // 200MB
  fm.multiples = true;

  fm.parse(req, function(err, fields, files) {
    res.writeHead(200, {'content-type': 'text/plain'});

    res.write('received upload:\n\n');

    res.end(util.inspect({fields: fields, files: files},{depth:3}));
  });
}

function fileDownload(req, res) {
  logger.info('URI \'POST \' was called.');
  res.writeHead(200, { 'content-type': 'text/plain' });

  let dp = config.dataPath || (__dirname + '../data');
  if (config.realm)
    dp += '/' + config.realm;

  let filename = req.params["filename"];

  res.sendfile( dp + "/" + filename);

  res.end();
}
