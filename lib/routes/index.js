/**
 * storage-node/routes
 */
"use strict";

const config = require('../config');
const express = require('express');

const status = require('./status');
const accounts = require('./accounts');
const storage = require('./storage');
const transform = require('./transform');
const fileio = require('./fileio');

/**
 * routes for /node
 */
var router = express.Router();
router.use('/', status);
router.use('/', accounts);
if (config.node.useStorage)   router.use('/', storage);
if (config.node.useTransform) router.use('/', transform);
if (config.node.useFileio)    router.use('/', fileio);
module.exports = router;
