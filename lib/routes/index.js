/**
 * storage-node/routes
 */
"use strict";

const express = require('express');

const status = require('./status');
const account = require('./account');
const storage = require('./storage');
const transform = require('./transform');
const fileio = require('./fileio');

/**
 * routes for /node
 */
var router = express.Router();
router.use('/', status);
router.use('/', account);
router.use('/', storage);
router.use('/', transform);
router.use('/', fileio);
module.exports = router;
