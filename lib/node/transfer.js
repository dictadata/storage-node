/**
 * storage-node/transfer
 */
"use strict";

const express = require('express');
const authorize = require("../authorize");
const roles = require("../roles");
const config = require('../config');
const logger = require('../logger');
const formidable = require('formidable');
const fs = require('fs');
const stream = require('stream');
const util = require('util');
const storage = require('@dictadata/storage-junctions');

const pipeline = util.promisify(stream.pipeline);

/**
 * transfer routes
 */
var router = express.Router();
router.post('/transfer', authorize([roles.ETL, roles.Admin]), transfer);
router.post('/import', authorize([roles.ETL, roles.Admin]), importFile);
router.get('/transfer/test', authorize([roles.Admin]), test);
module.exports = router;

/**
 *  transfer handlers
 */

async function test(req, res) {
  logger.verbose('/transfer/test');

  var j1, j2;
  try {
    j1 = await storage.activate("csv|./test/data/|testfile.csv|*", { filename: './test/data/testfile.csv' });
    j2 = await storage.activate("csv|./test/data/|testoutput.csv|*", { filename: './test/data/testoutput.csv' });

    let encoding = await j1.getEncoding();

    logger.debug("encoding results");
    logger.debug(encoding);
    logger.debug(JSON.stringify(encoding.fields));

    logger.debug("put destination encoding");
    await j2.putEncoding(encoding);

    logger.debug("create streams");
    var reader = j1.getReadStream();
    var writer = j2.getWriteStream();

    logger.debug("start pipe");
    await pipeline(reader, writer)
    res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp({result: "ok"});
  }
  catch(err) {
    logger.error(err.message);
    res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
  }
  finally {
    if (j1)
      j1.relax();
    if (j2)
      j2.relax();
  }
}

async function transfer(req, res) {
  logger.verbose('/transfer');
  logger.debug(req.body);

  var source = req.body.source || {};
  var destination = req.body.destination || {};

  if (!source.smt || source.smt[0] === '$' || !destination.smt || destination.smt[0] === '$')
    throw new Error("invalid smt name", {statusCode: 400});

  var j1, j2;
  try {
    j1 = await storage.activate(config.smt[source.smt], source.options);
    j2 = await storage.activate(config.smt[destination.smt], destination.options);

    let encoding = await j1.getEncoding();

    logger.debug("encoding results");
    logger.debug(encoding);
    logger.debug(JSON.stringify(encoding.fields));

    logger.debug("put destination encoding");
    await j2.putEncoding(encoding);

    logger.debug("create streams");
    var reader = j1.getReadStream();
    var writer = j2.getWriteStream();

    var transforms = null;
    if (req.body.transforms) {
      logger.debug("transforms pipeline");
      transforms = j1.getTransform(req.body.transforms);
      await pipeline(reader, transforms, writer);
    }
    else {
      logger.debug("transfer pipeline");
      await pipeline(reader, writer);
    }

    res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp({ result: "ok" });
  }
  catch (err) {
    logger.error(err.message);
    res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
  }
  finally {
    if (j1)
      j1.relax();
    if (j2)
      j2.relax();
  }

}

async function importFile(req, res) {
  logger.verbose('/transfer importFile');
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
      logger.error(err.message);
      res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
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
        logger.error(err.message);
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
        results = await reader.scan(writer);
        logger.debug(results);

        res.set("Cache-Control", "public, max-age=60, s-maxage=60").jsonp(results);
      }
      catch(err) {
        logger.error(err.message);
        res.status(err.statusCode || 500).set('Content-Type', 'text/html').send(err.message);
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