function validateCredentials({ minPasswordLength, maxPasswordBytes, maxUsernameLength } = {}) {
  return (req, res, next) => {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || username.trim() === '') {
      return res.status(400).json({ error: 'username and password are required' });
    }

    if (typeof password !== 'string' || password === '') {
      return res.status(400).json({ error: 'username and password are required' });
    }

    if (maxUsernameLength && username.length > maxUsernameLength) {
      return res.status(400).json({
        error: `username must be at most ${maxUsernameLength} characters`,
      });
    }

    if (minPasswordLength && password.length < minPasswordLength) {
      return res.status(400).json({
        error: `password must be at least ${minPasswordLength} characters`,
      });
    }

    if (maxPasswordBytes && Buffer.byteLength(password, 'utf8') > maxPasswordBytes) {
      return res.status(400).json({
        error: `password must be at most ${maxPasswordBytes} bytes`,
      });
    }

    next();
  };
}

module.exports = { validateCredentials };
