require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { createApp } = require('./app');
const { createDb } = require('./db');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/app.sqlite');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = createDb(DB_PATH);
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`Book the Watch backend listening on port ${PORT}`);
});
