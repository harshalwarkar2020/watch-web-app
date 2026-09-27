const jwtService = require('../jwtService');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'missing or invalid token' });
  }

  try {
    req.user = jwtService.verify(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'missing or invalid token' });
  }
}

module.exports = { requireAuth };
