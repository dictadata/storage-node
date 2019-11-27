'use strict';

const Roles = require('./roles');
const logger = require('./logger');

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

      let authorized = (roles[0] === Roles.Public);
      if (req.user) {
        for ( let i = 0; i < req.user.roles.length; i++ ) {
          if (roles.length && roles.includes(req.user.roles[i])) {
            // authorization successful
            authorized = true;
            break;
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
