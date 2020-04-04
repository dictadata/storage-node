/**
 * storage-node/clientStream
 *
 * transfers between:
 *  client and storage-node
 */
"use strict";

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const config = require('../config');
const logger = require('../logger');
const formidable = require('formidable');
const fs = require('fs');
const util = require('util');
const path = require('path');

/**
 * upload routes
 */
var router = express.Router();
router.get('/export/:filename', authorize([roles.ETL, roles.Admin]), exportData);
router.put('/import/:filename', authorize([roles.ETL, roles.Admin]), importData);
router.post('/upload', authorize([roles.ETL, roles.Admin]), uploadFiles);
module.exports = router;

/**
 *
 * @param {*} req
 * @param {*} res
 */
function exportData(req, res) {
  logger.verbose('/clientStream export');
  res.writeHead(200, { 'content-type': 'text/plain' });

  let dp = config.dataPath || path.join(__dirname, '../data');
  if (config.realm)
    dp += '/' + config.realm;

  let filename = req.params["filename"];

  res.sendfile( dp + "/" + filename, {maxAge: 60});
}

/**
 *
 * @param {*} req
 * @param {*} res
 */
function importData(req, res) {
  logger.verbose('/clientStream import');

  let dp = config.dataPath || path.join(__dirname, '../data');
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
    res.write(util.inspect({fields: fields, files: files},{depth:3}));
    res.end();
  });
}

/**
 *
 * @param {*} req
 * @param {*} res
 */
async function uploadFiles(req, res) {
  logger.verbose('/transfer import');
  logger.debug(req.body);

  let form = new formidable.IncomingForm();
  form.encoding = 'utf-8';
  form.maxFileSize = config.maxFileSize || 200 * 1024 * 1024; // 200MB
  form.multiples = true;
  //form.keepExtensions = false;
  //form.uploadDir = os.tempdir();

  // parse req.body into inputs (form fields) and files
  form.parse(req, async function(err, fields, files) {
    logger.debug('formidable parse')
    logger.debug(fields);
    logger.debug(files);

    let importList = JSON.parse(fields.importList);
    logger.debug("importList length " + importList.length);

    let fileList = [];
    if (!Array.isArray(files.fileList))
      fileList.push(files.fileList);  // single file upload
    else
      fileList = files.fileList; // multiple files
    logger.debug("fileList length " + fileList.length)

    if (importList.length != fileList.length) {
      let err = new Error('Invalid input values');
      logger.error(err);
      res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
      return;
    }

    // create upload/prefix directory if needed
    let uploadDir = config.uploadsPath + fields.prefix + "/";
    if (!fs.existsSync(uploadDir))
      fs.mkdirSync(uploadDir, { recursive: true });

    // move files to upload directory
    for (let i = 0; i < fileList.length; i++) {
      logger.debug(i, importList[i]);
      let filename = uploadDir + fileList[i].name;
      importList[i].filename = filename;
      logger.debug('src: ', fileList[i].path);
      logger.debug('dst: ', filename);
      try {
        if (fs.existsSync(filename)) {
          logger.warn("dst exists");
          fs.unlinkSync(filename);
        }
        fs.renameSync(fileList[i].path, filename);
      }
      catch (err) {
        logger.error(err);
      }
    }

    logger.debug(importList);
    for (let i = 0; i < importList.length; i++) {
      let index = fields.prefix + '_' + importList[i].container;

      var j1, j2;
      try {
        j1 = await storage.activate("csv|.|input.csv|*", { filename: importList[i].filename });
        j2 = await storage.activate("elasticsearch|./test/data/|testoutput.csv|*");

        var reader = j1.getReadStream();
        var writer = j2.getWriteStream();

        // examine file for encodings
        let numLines = -1;
        let results = await reader.codify(numLines);
        logger.debug(results);

        // update destination encodings
        results = await writer.putEncoding(reader.getEncoding());
        logger.debug(results);

        // read csv records and import to Elasticsearch
        await pipeline(reader, writer);
        logger.debug(results);

        res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(results);
      }
      catch(err) {
        logger.error(err);
        res.status(err.statusCode || 500).set('Content-Type', 'text/plain').send(err.message);
      }
      finally {
        if (j1)
          j1.relax();
        if (j2)
          j2.relax();
      }
    }

  });
}
