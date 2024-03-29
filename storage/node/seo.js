'use strict';

/**
 * SEO Middleware
 *
 * @param      {Express Request}   req     Express request object
 * @param      {Express Response}  res     Express response object
 * @param      {Function}          next    next callback function
 * @return     {any}               void
 */
module.exports = exports = function (req, res, next) {
  if (req.path.length > 1 && req.path.endsWith('/')) {
    let query = req.url.slice(req.path.length) || '';
    res.redirect(301, req.path.slice(0, -1) + query);
  } else {
    return next();
  }
};
