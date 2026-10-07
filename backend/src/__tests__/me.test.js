const request = require('supertest');
const jwt = require('jsonwebtoken');
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

  it('rejects a request with no Authorization header as AUTH_REQUIRED', async () => {
    const { app } = await buildTestAppWithLoggedInUser();

    const res = await request(app).get('/api/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
    });
  });

  it('rejects a non-Bearer Authorization scheme as AUTH_REQUIRED', async () => {
    const { app } = await buildTestAppWithLoggedInUser();

    const res = await request(app).get('/api/me').set('Authorization', 'Basic abc123');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('rejects a garbage token as AUTH_INVALID', async () => {
    const { app } = await buildTestAppWithLoggedInUser();

    const res = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'AUTH_INVALID', message: 'Invalid token' },
    });
  });

  it('rejects a token signed with a different secret as AUTH_INVALID', async () => {
    const { app } = await buildTestAppWithLoggedInUser();
    const forged = jwt.sign({ sub: 1, username: 'alice' }, 'other-secret');

    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID');
  });

  it('rejects an expired token as AUTH_EXPIRED', async () => {
    const { app } = await buildTestAppWithLoggedInUser();
    const expiredToken = jwtService.sign({ sub: 1, username: 'alice' }, { expiresIn: '-1s' });

    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'AUTH_EXPIRED', message: 'Token expired' },
    });
  });

  it('passes non-token failures (missing JWT_SECRET) to the error handler as 500', async () => {
    const { app, token } = await buildTestAppWithLoggedInUser();
    delete process.env.JWT_SECRET;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);

    process.env.JWT_SECRET = 'test-secret';
    errorSpy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'internal server error' });
  });
});
