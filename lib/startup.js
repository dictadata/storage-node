/**
 * storage-node/startup
 */
"use strict";

var startupFuncs = exports.list = [];

exports.add = function (finit) {
  startupFuncs.push(finit);
};
