/**
 * storage/node/roles
 *
 * Roles are enumeration of string values.
 *
 * Example:
 *    user.roles = [ roles.User, "Coder", "MyRole" ]
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
  Guest: 'Guest',     // authenticated, limit functionality
  User: 'User',       // authenticated
  Coder: 'Coder',     // codex editor
  ETL: 'ETL',         // transfer user
  Monitor: 'Monitor', // status API's
  Admin: 'Admin',     // accounts administrator
  Super: 'Super',     // god mode
};

module.exports = roles;
