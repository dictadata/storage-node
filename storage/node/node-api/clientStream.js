/**
 * storage-node/clientStream
 *
 * !!!!! work in progress !!!!!
 * !!!!! not tested recently !!!!!
 *
 * transfers between:
 *  client and storage-node
 */
"use strict";

const express = require('express');
const authorize = require("../authorize");
const Roles = require("../roles");
const config = require('../config');
const logger = require('../../utils/logger');
const formidable = require('formidable');
const fs = require('fs');
const stream = require('stream').promises;
const util = require('util');
const path = require('path');

const storage = require('@dictadata/storage-junctions');
const { StorageError } = require("@dictadata/storage-junctions/types");


/**
 * upload routes
 */
var router = express.Router();
router.get('/export/:filename', authorize([ Roles.ETL ]), exportData);
router.put('/import/:filename', authorize([ Roles.ETL ]), importData);
router.post('/upload', authorize([ Roles.ETL ]), uploadFiles);
module.exports = router;

/**
 *
 * @param {*} req
 * @param {*} res
 */
function exportData(req, res) {
  logger.verbose('/clientStream export');
  res.status(200).set('content-type', 'text/plain');

  let dp = config.dataPath || path.join(__dirname, '../data');
  if (config.realm)
    dp += '/' + config.realm;

  let filename = req.params[ "filename" ];

  res.sendfile(dp + "/" + filename, { maxAge: 60 });
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

  fm.parse(req, function (err, fields, files) {
    res.status(200).set('content-type', 'text/plain');
    res.send('received upload:\n\n');
    res.send(util.inspect({ fields: fields, files: files }, { depth: 3 }));
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
  logger.debug(JSON.stringify(req.body));

  let form = new formidable.IncomingForm();
  form.encoding = 'utf-8';
  form.maxFileSize = config.maxFileSize || 200 * 1024 * 1024; // 200MB
  form.multiples = true;
  //form.keepExtensions = false;
  //form.uploadDir = os.tempdir();

  // parse req.body into inputs (form fields) and files
  form.parse(req, async function (err, fields, files) {
    logger.debug('formidable parse')
    logger.debug(JSON.stringify(fields));
    logger.debugJSON.stringify((files));

    let importList = JSON.parse(fields.importList);
    logger.debug("importList length " + importList.length);

    let fileList = [];
    if (!Array.isArray(files.fileList))
      fileList.push(files.fileList);  // single file upload
    else
      fileList = files.fileList; // multiple files
    logger.debug("fileList length " + fileList.length)

    if (importList.length != fileList.length) {
      let err = new StorageError(400, 'Invalid input values');
      logger.error(err.message);
      res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
      return;
    }

    // create upload/prefix directory if needed
    let uploadDir = config.uploadsPath + fields.prefix + "/";
    if (!fs.existsSync(uploadDir))
      await fs.promises.mkdir(uploadDir, { recursive: true });

    // move files to upload directory
    for (let i = 0; i < fileList.length; i++) {
      logger.debug("i: " + i + " " + importList[ i ]);
      let filename = uploadDir + fileList[ i ].name;
      importList[ i ].filename = filename;
      logger.debug('src: ' + fileList[ i ].path);
      logger.debug('dst: ' + filename);
      try {
        if (fs.existsSync(filename)) {
          logger.warn("dst exists");
          await fs.promises.unlink(filename);
        }
        await fs.promises.rename(fileList[ i ].path, filename);
      }
      catch (err) {
        logger.error(err.message);
      }
    }

    logger.debug(JSON.stringify(importList));
    for (let i = 0; i < importList.length; i++) {
      let index = fields.prefix + '_' + importList[ i ].container;

      var jo, jt;
      try {
        jo = await storage.activate("csv|.|input.csv|*", { filename: importList[ i ].filename, header: true });
        jt = await storage.activate("elasticsearch|./test/data/output/stream/|testoutput.csv|*");

        var reader = jo.createReader();
        var writer = jt.createWriter();

        // examine file for encodings
        let numLines = -1;
        let results = await reader.codify(numLines);
        logger.debug(JSON.stringify(results));

        // update terminal encodings
        writer.encoding = reader.encoding;

        // read csv records and import to Elasticsearch
        await stream.pipeline(reader, writer);
        logger.debug(JSON.stringify(results));

        res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(results);
      }
      catch (err) {
        logger.error(err.message);
        res.status(err.status || 500).set('Content-Type', 'text/plain').send(err.message);
      }
      finally {
        if (jo)
          jo.relax();
        if (jt)
          jt.relax();
      }
    }

  });
}
