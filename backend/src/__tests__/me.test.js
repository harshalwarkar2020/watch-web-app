const request = require('supertest');
const { createApp } = require('../app');
const { createDb } = require('../db');
const jwtService = require('../jwtService');

const ORIGINAL_SECRET = process.env.JWT_SECRET;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

afterAll(() => {
  process.env.JWT_SECRET = ORIGINAL_SECRET;
});

async function buildTestAppWithLoggedInUser() {
  const db = createDb(':memory:');
  const app = createApp(db);
  await request(app)
    .post('/api/register')
    .send({ username: 'alice', password: 'password1' });
  const loginRes = await request(app)
    .post('/api/login')
    .send({ username: 'alice', password: 'password1' });
  return { app, token: loginRes.body.token };
}

describe('GET /api/me', () => {
  it('returns the username for a valid token (design-review finding #1)', async () => {
    const { app, token } = await buildTestAppWithLoggedInUser();

    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: 'alice' });
  });

  it('rejects a request with no Authorization header', async () => {
    const { app } = await buildTestAppWithLoggedInUser();

    const res = await request(app).get('/api/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'missing or invalid token' });
  });

  it('rejects a garbage token', async () => {
    const { app } = await buildTestAppWithLoggedInUser();

    const res = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'missing or invalid token' });
  });

  it('rejects an expired token', async () => {
    const { app } = await buildTestAppWithLoggedInUser();
    const expiredToken = jwtService.sign({ sub: 1, username: 'alice' }, { expiresIn: '-1s' });

    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'missing or invalid token' });
  });
});
