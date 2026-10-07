const jwt = require('jsonwebtoken');

const DEFAULT_EXPIRES_IN = '1h';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

// Read on every call so config changes and tests that set process.env after
// require() are honoured. Unset or blank falls back to the default; format
// validation is delegated to the JWT library, which throws on an invalid value.
function getExpiresIn() {
  const raw = process.env.JWT_EXPIRES_IN;
  if (typeof raw !== 'string' || raw.trim() === '') {
    return DEFAULT_EXPIRES_IN;
  }
  return raw.trim();
}

function sign(payload, options = {}) {
  return jwt.sign(payload, getSecret(), { expiresIn: getExpiresIn(), ...options });
}

function verify(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { sign, verify };
