function validateCredentials({ minPasswordLength } = {}) {
  return (req, res, next) => {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || username.trim() === '') {
      return res.status(400).json({ error: 'username and password are required' });
    }

    if (typeof password !== 'string' || password === '') {
      return res.status(400).json({ error: 'username and password are required' });
    }

    if (minPasswordLength && password.length < minPasswordLength) {
      return res.status(400).json({
        error: `password must be at least ${minPasswordLength} characters`,
      });
    }

    next();
  };
}

module.exports = { validateCredentials };
