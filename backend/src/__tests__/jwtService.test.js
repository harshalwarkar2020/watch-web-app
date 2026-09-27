const jwt = require('jsonwebtoken');
const { sign, verify } = require('../jwtService');

describe('jwtService', () => {
  const ORIGINAL_SECRET = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_SECRET;
  });

  it('signs a payload and verify() returns it back', () => {
    const token = sign({ sub: 42 });
    const decoded = verify(token);
    expect(decoded).toMatchObject({ sub: 42 });
  });

  it('rejects a tampered/invalid token', () => {
    const token = sign({ sub: 42 });
    const tampered = token.slice(0, -2) + 'xx';
    expect(() => verify(tampered)).toThrow();
  });

  it('rejects an expired token', () => {
    const token = sign({ sub: 42 }, { expiresIn: '-1s' });
    expect(() => verify(token)).toThrow(jwt.TokenExpiredError);
  });

  it('throws a clear error when JWT_SECRET is unset', () => {
    delete process.env.JWT_SECRET;
    expect(() => sign({ sub: 42 })).toThrow('JWT_SECRET environment variable is not set');
    expect(() => verify('anything')).toThrow('JWT_SECRET environment variable is not set');
  });
});
