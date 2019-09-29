/**
 * server/router.js
 */
"use strict";

const express = require('express');

const status = require('./status');
const account = require('./account');
const storage = require('./storage');

const etl = require('./etl');
const upload = require('./upload');

/**
 * routes
 */
var router = express.Router();
router.use('/', status);
router.use('/', account);
router.use('/', storage);
router.use('/', etl);
router.use('/', upload);
module.exports = router;
