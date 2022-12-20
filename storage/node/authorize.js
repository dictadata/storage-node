/**
 * storage/node/authorize
 */
'use strict';

const Roles = require('./roles');
const logger = require('../utils/logger');

module.exports = authorize;

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
      logger.debug(roles, (req.user && req.user.roles));

      // check if route is public
      let authorized = (roles.includes(Roles.Public));

      if (!authorized && req.user) {
        // check if user is Superman
        authorized = req.user.roles.includes(Roles.Super);

        if (!authorized) {
          // check if user has a role that matches an interface role
          for (let i = 0; i < roles.length; i++) {
            if (req.user.roles.includes(roles[ i ])) {
              authorized = true;
              break;
            }
          }
        }
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
