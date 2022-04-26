/**
 * storage/node/roles.js
 *
 * A role is denoted by a simple string value.
 *
 * Example:
 *    let myroles = [ roles.User, "Coder", "MyRole" ]
 */
"use strict";

/**
 * Enumeration of standard roles.
 *
 * Note: Additional roles can be added from the storage-node.config.json file,
 *   but they won't be available to module level (global) code,
 *   e.g. when defining Express router routes.
 */
const roles = {
  Public: 'Public',   // not authenticated
  User: 'User',       // authenticated
  Coder: 'Coder',     // codex writer
  ETL: 'ETL',         // codex ETL user
  Monitor: 'Monitor', // status API's
  Admin: 'Admin'      // god mode
};

module.exports = roles;
