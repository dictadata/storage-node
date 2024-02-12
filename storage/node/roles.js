/**
 * storage/node/roles
 */
"use strict";

/**
 * Enumeration of standard roles.
 *
 * Example:
 *    user.roles = [ Roles.User, "Coder", "MyRole" ]*
 *
 * Note: Additional roles can be added to the storage-node.config.json file,
 *   but they won't be available to module level (global) code,
 *   because modules load before config file is read.
 *   e.g. when defining Express router routes.
 */
const Roles = {
  // public routes
  Public: 'Public',   // authorizes routes for all requests, use ONLY for routes

  // user route roles
  Guest: 'Guest',     // used for limited functionality
  User: 'User',       // normal user

  // advanced user route roles
  // only Admin can assign advanced roles
  Admin: 'Admin',     // accounts administrator
  Coder: 'Coder',     // Engrams and Tracts editor
  ETL: 'ETL',         // transfer user
  Monitor: 'Monitor', // status API's only

  // special server roles
  Super: 'Super',     // god mode, authorized for all routes
};

module.exports = Roles;
