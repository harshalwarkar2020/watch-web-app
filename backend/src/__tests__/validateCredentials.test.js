const { validateCredentials } = require('../middleware/validateCredentials');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validateCredentials', () => {
  it('calls next() when username and password are present', () => {
    const middleware = validateCredentials();
    const req = { body: { username: 'alice', password: 'secret1' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a missing username with 400', () => {
    const middleware = validateCredentials();
    const req = { body: { password: 'secret1' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'username and password are required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a missing password with 400', () => {
    const middleware = validateCredentials();
    const req = { body: { username: 'alice' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects empty-string username/password with 400', () => {
    const middleware = validateCredentials();
    const req = { body: { username: '   ', password: '' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a password under minPasswordLength when configured', () => {
    const middleware = validateCredentials({ minPasswordLength: 8 });
    const req = { body: { username: 'alice', password: 'short' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'password must be at least 8 characters',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a username longer than maxUsernameLength characters', () => {
    const middleware = validateCredentials({ maxUsernameLength: 30 });
    const req = { body: { username: 'a'.repeat(31), password: 'secret1' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'username must be at most 30 characters',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a username of exactly maxUsernameLength characters', () => {
    const middleware = validateCredentials({ maxUsernameLength: 30 });
    const req = { body: { username: 'a'.repeat(30), password: 'secret1' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('rejects a password over maxPasswordBytes UTF-8 bytes', () => {
    const middleware = validateCredentials({ maxPasswordBytes: 72 });
    const req = { body: { username: 'alice', password: 'a'.repeat(73) } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'password must be at most 72 bytes',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a password of exactly maxPasswordBytes bytes', () => {
    const middleware = validateCredentials({ maxPasswordBytes: 72 });
    const req = { body: { username: 'alice', password: 'a'.repeat(72) } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('measures the password in UTF-8 bytes, not characters', () => {
    const middleware = validateCredentials({ maxPasswordBytes: 72 });
    // 37 x 2-byte chars = 37 characters but 74 bytes
    const req = { body: { username: 'alice', password: 'é'.repeat(37) } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'password must be at most 72 bytes',
    });
  });

  it('reports the min-length error before the max-bytes error', () => {
    const middleware = validateCredentials({ minPasswordLength: 8, maxPasswordBytes: 72 });
    const req = { body: { username: 'alice', password: 'short' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      error: 'password must be at least 8 characters',
    });
  });

  it('does not enforce minPasswordLength when not configured (login use case)', () => {
    const middleware = validateCredentials();
    const req = { body: { username: 'alice', password: 'short' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
