const express = require('express');
const bcrypt = require('bcrypt');
const { validateCredentials } = require('../middleware/validateCredentials');
const { requireAuth } = require('../middleware/requireAuth');
const jwtService = require('../jwtService');

const BCRYPT_COST_FACTOR = 10;

// Precomputed hash with no matching plaintext, used to keep bcrypt.compare()
// timing consistent whether or not the username exists (avoids a timing
// side-channel that would otherwise let an attacker enumerate usernames).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST_FACTOR);

const router = express.Router();

router.post(
  '/register',
  validateCredentials({ minPasswordLength: 8 }),
  async (req, res, next) => {
    const { username, password } = req.body;
    const db = req.app.locals.db;

    try {
      const existing = db
        .prepare('SELECT id FROM users WHERE username = ?')
        .get(username);

      if (existing) {
        return res.status(409).json({ error: 'username already exists' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

      db.prepare(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)'
      ).run(username, passwordHash);

      return res.status(201).json({ message: 'registration successful' });
    } catch (err) {
      return next(err);
    }
  }
);

router.post('/login', validateCredentials(), async (req, res, next) => {
  const { username, password } = req.body;
  const db = req.app.locals.db;

  try {
    const user = db
      .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
      .get(username);

    const matches = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

    if (!user || !matches) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const token = jwtService.sign({ sub: user.id, username: user.username });

    return res.status(200).json({ token, message: 'login successful' });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json({ username: req.user.username });
});

module.exports = router;
