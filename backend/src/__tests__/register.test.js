const request = require('supertest');
const { createApp } = require('../app');
const { createDb } = require('../db');

function buildTestApp() {
  const db = createDb(':memory:');
  const app = createApp(db);
  return { app, db };
}

describe('POST /api/register', () => {
  it('registers a new user and returns 201 (AC-1)', async () => {
    const { app, db } = buildTestApp();

    const res = await request(app)
      .post('/api/register')
      .send({ username: 'alice', password: 'password1' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'registration successful' });

    const row = db.prepare('SELECT * FROM users WHERE username = ?').get('alice');
    expect(row).toBeTruthy();
    expect(row.password_hash).not.toBe('password1');
  });

  it('rejects a duplicate username with 409 (AC-2)', async () => {
    const { app } = buildTestApp();

    await request(app)
      .post('/api/register')
      .send({ username: 'alice', password: 'password1' });

    const res = await request(app)
      .post('/api/register')
      .send({ username: 'alice', password: 'differentPass1' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'username already exists' });
  });

  it('rejects missing/empty fields with 400 (AC-3)', async () => {
    const { app } = buildTestApp();

    const res = await request(app).post('/api/register').send({ username: 'alice' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'username and password are required' });
  });

  it('rejects a password under 8 characters with 400 (NFR-2)', async () => {
    const { app } = buildTestApp();

    const res = await request(app)
      .post('/api/register')
      .send({ username: 'alice', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'password must be at least 8 characters' });
  });
});
