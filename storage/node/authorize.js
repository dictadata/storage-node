/**
 * storage/node/authorize
 */
'use strict';

const Roles = require('./roles');
const logger = require('../utils/logger');

module.exports = exports = authorize;

/**
 * authorize request by matching request and user roles
 * @param {*} roles can be a single roles string or an array of roles
 */
function authorize(roles = []) {
  if (typeof roles === 'string') {
    roles = roles.split();
  }

  return [
    (req, res, next) => {
      logger.verbose("authorize");
      logger.debug("roles: " + JSON.stringify(roles));
      logger.debug("users: " + JSON.stringify(req.user.roles));

      // check if route is public
      let authorized = (roles.includes(Roles.Public));

      if (!authorized && req.user) {
        // check if user is Superman
        // or user has at least one matching role
        authorized = req.user.roles.includes(Roles.Super) ||
          roles.some(role => req.user.roles.includes(role));
      }

      if (authorized) {
        next();
      }
      else {
        logger.verbose('authorization denied');
        res.sendStatus(401);
      }
    }
  ];
}
