/**
 * storage/node/node-api/index
 */
"use strict";

const config = require('../config');
const express = require('express');

const status = require('./status');
const accounts = require('./accounts');
const user = require('./user');
const engrams = require('./engrams');
const tracts = require('./tracts');
const storage = require('./storage');
const transfer = require('./transfer');
const clientStream = require('./clientStream');
const transport = require('./transfer');
const log = require('./log');

/**
 * routes for /node
 */
var router = express.Router();
router.use('/', status);
router.use('/', user);
router.use('/', accounts);
router.use('/', engrams);
router.use('/', storage);
router.use('/', transfer);
router.use('/', tracts);
if (config[ "node-api" ].useLog) router.use('/', log);
if (config[ "node-api" ].useClientStream) router.use('/', clientStream);
if (config[ "node-api" ].useTransport) router.use('/', transport);
module.exports = router;
