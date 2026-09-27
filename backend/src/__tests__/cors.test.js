const request = require('supertest');
const { createApp } = require('../app');
const { createDb } = require('../db');

describe('CORS configuration', () => {
  it('allows the configured frontend origin', async () => {
    const app = createApp(createDb(':memory:'));

    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('never echoes back an unrecognized requesting origin (browser will reject the mismatch)', async () => {
    const app = createApp(createDb(':memory:'));

    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://evil.example.com');

    // cors() with a fixed origin string always returns the configured origin,
    // never the requester's — so a browser at evil.example.com sees an
    // Allow-Origin that doesn't match its own origin and blocks the response.
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).not.toBe('http://evil.example.com');
  });
});
