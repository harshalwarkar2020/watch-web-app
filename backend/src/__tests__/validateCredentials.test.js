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

  it('does not enforce minPasswordLength when not configured (login use case)', () => {
    const middleware = validateCredentials();
    const req = { body: { username: 'alice', password: 'short' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
