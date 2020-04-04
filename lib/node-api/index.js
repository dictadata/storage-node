/**
 * storage-node/index
 */
"use strict";

const config = require('../config');
const express = require('express');

const status = require('./status');
const accounts = require('./accounts');
const storage = require('./storage');
const transfer = require('./transfer');
const clientStream = require('./clientStream');
const transport = require('./transfer');

/**
 * routes for /node
 */
var router = express.Router();
router.use('/', status);
router.use('/', accounts);
if (config["node-api"].useStorage)   router.use('/', storage);
if (config["node-api"].useTransfer)  router.use('/', transfer);
if (config["node-api"].useClientStream) router.use('/', clientStream);
if (config["node-api"].useTransport) router.use('/', transport);
module.exports = router;
