const express = require('express');
const request = require('supertest');
const { errorHandler } = require('../middleware/errorHandler');

function buildTestApp() {
  const app = express();
  app.use(express.json());

  app.post('/throw', () => {
    throw new Error('something internal broke');
  });

  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns 400 with a generic message for malformed JSON bodies', async () => {
    const app = buildTestApp();
    const res = await request(app)
      .post('/throw')
      .set('Content-Type', 'application/json')
      .send('{not valid json');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid request body' });
  });

  it('returns 500 with a generic message for an uncaught route error, without leaking details', async () => {
    const app = buildTestApp();
    const res = await request(app).post('/throw').send({});

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'internal server error' });
    expect(JSON.stringify(res.body)).not.toContain('something internal broke');
  });
});
