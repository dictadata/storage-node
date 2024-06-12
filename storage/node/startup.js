/**
 * storage-node/startup
 */
"use strict";

// const { exitOnError } = require("winston");

var startup_list = [];

/**
 *
 * @param {*} f_init a startup function
 */
exports.add = (f_init) => {
  startup_list.push(f_init);
};

exports.exec = async (config) => {

  for (let f of startup_list) {
    let exitCode = await f(config);
    if (exitCode) return exitCode;  // startup failed
  }

  return 0;  // success
};
