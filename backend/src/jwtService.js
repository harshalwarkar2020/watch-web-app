const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

function sign(payload, options = {}) {
  return jwt.sign(payload, getSecret(), { expiresIn: '1h', ...options });
}

function verify(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { sign, verify };
