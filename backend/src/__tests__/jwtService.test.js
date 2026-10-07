const jwt = require('jsonwebtoken');
const { sign, verify } = require('../jwtService');

describe('jwtService', () => {
  const ORIGINAL_SECRET = process.env.JWT_SECRET;
  const ORIGINAL_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    delete process.env.JWT_EXPIRES_IN;
  });

  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_SECRET;
    if (ORIGINAL_EXPIRES_IN === undefined) {
      delete process.env.JWT_EXPIRES_IN;
    } else {
      process.env.JWT_EXPIRES_IN = ORIGINAL_EXPIRES_IN;
    }
  });

  function lifetimeSeconds(token) {
    const { iat, exp } = jwt.decode(token);
    return exp - iat;
  }

  describe('JWT_EXPIRES_IN', () => {
    it('defaults to 1h when unset', () => {
      expect(lifetimeSeconds(sign({ sub: 1 }))).toBe(3600);
    });

    it('defaults to 1h when blank', () => {
      process.env.JWT_EXPIRES_IN = '   ';
      expect(lifetimeSeconds(sign({ sub: 1 }))).toBe(3600);
    });

    it('honours a configured value', () => {
      process.env.JWT_EXPIRES_IN = '15m';
      expect(lifetimeSeconds(sign({ sub: 1 }))).toBe(900);
    });

    it('applies changes made after module load', () => {
      process.env.JWT_EXPIRES_IN = '2h';
      expect(lifetimeSeconds(sign({ sub: 1 }))).toBe(7200);
      process.env.JWT_EXPIRES_IN = '30s';
      expect(lifetimeSeconds(sign({ sub: 1 }))).toBe(30);
    });

    it('lets an explicit expiresIn option override the env value', () => {
      process.env.JWT_EXPIRES_IN = '15m';
      expect(lifetimeSeconds(sign({ sub: 1 }, { expiresIn: '2m' }))).toBe(120);
    });

    it('throws when the configured value is invalid', () => {
      process.env.JWT_EXPIRES_IN = 'not-a-duration';
      expect(() => sign({ sub: 1 })).toThrow();
    });
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
