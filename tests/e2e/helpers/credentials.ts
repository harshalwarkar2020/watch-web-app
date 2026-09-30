import { randomBytes, randomInt } from 'node:crypto';

/**
 * Test-data builders for credential-validation specs.
 *
 * - Usernames are unique per call (time + random), so tests are parallel-safe and order-independent.
 * - Passwords are generated at runtime; no secrets are committed to the repo.
 * - Byte-exact builders let boundary tables state intent ("72 bytes") rather than magic strings.
 */

/** Limits under test (see auth-max-password-bytes-design.md, login username cap loosened to 255). */
export const LIMITS = {
  register: { usernameChars: 30, passwordMinChars: 8, passwordMaxBytes: 72 },
  login: { usernameChars: 255, passwordMaxBytes: 512 },
} as const;

/** Exact server error messages (HTTP 400 unless noted). */
export const API_ERRORS = {
  required: 'username and password are required',
  usernameMax30: 'username must be at most 30 characters',
  usernameMax255: 'username must be at most 255 characters',
  passwordMin8: 'password must be at least 8 characters',
  passwordMax72: 'password must be at most 72 bytes',
  passwordMax512: 'password must be at most 512 bytes',
  invalidCredentials: 'invalid credentials', // HTTP 401
} as const;

/** Exact client-side messages rendered in the role="alert" paragraph. */
export const UI_ERRORS = {
  required: 'Username and password are required',
  usernameMax30: 'Username must be at most 30 characters',
  usernameMax255: 'Username must be at most 255 characters',
  passwordMax72: 'Password must be at most 72 bytes',
  passwordMax512: 'Password must be at most 512 bytes',
} as const;

const ALNUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const utf8Bytes = (value: string): number => Buffer.byteLength(value, 'utf8');

/** Random ASCII alphanumeric string of exactly `length` characters (= `length` bytes). */
export function randomAscii(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALNUM[randomInt(ALNUM.length)];
  return out;
}

/**
 * Recipe for a password: `ascii` random ASCII chars followed by `count` repetitions of `unit`.
 * Examples: { ascii: 72 } -> 72 bytes; { unit: 'é', count: 36 } -> 36 chars / 72 bytes;
 * { ascii: 71, unit: 'é', count: 1 } -> 72 chars / 73 bytes.
 */
export interface PasswordRecipe {
  ascii?: number;
  unit?: string;
  count?: number;
}

export function buildPassword({ ascii = 0, unit = '', count = 0 }: PasswordRecipe): string {
  return randomAscii(ascii) + unit.repeat(count);
}

/**
 * Build a password from a recipe and assert it has the byte size the test table claims.
 * Guards the tables against arithmetic mistakes so a wrong table fails loudly and early.
 */
export function passwordWithBytes(recipe: PasswordRecipe, expectedBytes: number): string {
  const value = buildPassword(recipe);
  const actual = utf8Bytes(value);
  if (actual !== expectedBytes) {
    throw new Error(`Test-data error: recipe ${JSON.stringify(recipe)} is ${actual} bytes, expected ${expectedBytes}`);
  }
  return value;
}

/** Short unique token (~17 chars): safe inside the 30-char register username limit. */
function uniqueToken(): string {
  return `e${Date.now().toString(36)}${randomBytes(4).toString('hex')}`;
}

/**
 * Unique username. When `length` is given, the result is padded (with `padUnit`, default "x")
 * to exactly `length` characters (UTF-16 length, matching how both tiers measure it).
 * The unique token always comes first, so padded names are still unique.
 */
export function uniqueUsername(length?: number, padUnit = 'x'): string {
  const token = uniqueToken();
  if (length === undefined) return token;
  if (length < token.length) {
    throw new Error(`Test-data error: username length ${length} is shorter than unique token (${token.length})`);
  }
  return token + padUnit.repeat(length - token.length);
}

/** A random valid password (12 ASCII chars) for seeding accounts. */
export const validPassword = (): string => randomAscii(12);
