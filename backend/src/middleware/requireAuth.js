const jwt = require('jsonwebtoken');
const jwtService = require('../jwtService');

const AUTH_ERRORS = {
  AUTH_REQUIRED: 'Authentication required',
  AUTH_INVALID: 'Invalid token',
  AUTH_EXPIRED: 'Token expired',
};

function sendAuthError(res, code) {
  return res.status(401).json({
    error: { code, message: AUTH_ERRORS[code] },
  });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return sendAuthError(res, 'AUTH_REQUIRED');
  }

  try {
    req.user = jwtService.verify(token);
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return sendAuthError(res, 'AUTH_EXPIRED');
    }
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.NotBeforeError) {
      return sendAuthError(res, 'AUTH_INVALID');
    }
    // Not a token problem (e.g. missing JWT_SECRET): server misconfiguration.
    return next(err);
  }
}

module.exports = { requireAuth };
