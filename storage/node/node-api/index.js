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
const etl = require('./etl');
const webdata = require('./webdata');
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
router.use('/', etl);
router.use('/', tracts);
router.use('/', log);
router.use('/', webdata);

module.exports = router;
