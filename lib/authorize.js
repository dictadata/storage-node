'use strict';

const roles = require('./roles');
const logger = require('./logger');

module.exports = authorize;

/**
 * authorize request by matching request and user roles
 * @param {*} roles can be a single roles string or an array of roles
 */
function authorize(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return [
    (req, res, next) => {
      //console.log("authorize");
      //console.log(roles, req.user.roles);

      let authorized = (roles[0] === roles.Public);
      for ( let i = 0; i < req.user.roles.length; i++ ) {
        if (roles.length && roles.includes(req.user.roles[i])) {
          // authorization successful
          authorized = true;
          break;
        }
      }
      if (authorized) {
        next();
      }
      else {
        logger.info('denied');
        res.status(401).json({ message: 'Unauthorized' });
      }
    }
  ];
}
