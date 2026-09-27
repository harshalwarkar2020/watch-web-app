const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { errorHandler } = require('./middleware/errorHandler');

function createApp(db) {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: false,
    })
  );
  app.use(express.json());
  app.locals.db = db;

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api', authRoutes);

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
