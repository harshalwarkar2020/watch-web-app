const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../app');
const { createDb } = require('../db');

const ORIGINAL_SECRET = process.env.JWT_SECRET;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

afterAll(() => {
  process.env.JWT_SECRET = ORIGINAL_SECRET;
});

async function buildTestAppWithUser() {
  const db = createDb(':memory:');
  const app = createApp(db);
  await request(app)
    .post('/api/register')
    .send({ username: 'alice', password: 'password1' });
  return { app, db };
}

describe('POST /api/login', () => {
  it('logs in with correct credentials and returns a valid JWT (AC-4)', async () => {
    const { app } = await buildTestAppWithUser();

    const res = await request(app)
      .post('/api/login')
      .send({ username: 'alice', password: 'password1' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('login successful');
    expect(typeof res.body.token).toBe('string');

    const decoded = jwt.verify(res.body.token, 'test-secret');
    expect(decoded).toMatchObject({ username: 'alice' });
  });

  it('rejects a wrong password with 401 (AC-5)', async () => {
    const { app } = await buildTestAppWithUser();

    const res = await request(app)
      .post('/api/login')
      .send({ username: 'alice', password: 'wrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'invalid credentials' });
  });

  it('rejects an unknown username with the same 401 body as wrong password (AC-6, no enumeration)', async () => {
    const { app } = await buildTestAppWithUser();

    const res = await request(app)
      .post('/api/login')
      .send({ username: 'bob', password: 'password1' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'invalid credentials' });
  });

  it('rejects missing/empty fields with 400 (AC-7)', async () => {
    const { app } = await buildTestAppWithUser();

    const res = await request(app).post('/api/login').send({ username: 'alice' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'username and password are required' });
  });
});
