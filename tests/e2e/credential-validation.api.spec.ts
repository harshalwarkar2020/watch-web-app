import { test, expect } from '@playwright/test';
import { expectApiError, loginViaApi, postAuth, registerViaApi, seedUser } from './helpers/auth-api';
import {
  API_ERRORS,
  passwordWithBytes,
  randomAscii,
  uniqueUsername,
  validPassword,
  type PasswordRecipe,
} from './helpers/credentials';

/**
 * Credential validation - API scenarios (Playwright `request` fixture, no browser UI).
 * Gherkin source: tests/e2e/features/credential-validation.feature (@api scenarios, ids CV-20 .. CV-36).
 *
 * These prove the backend enforces every limit on its own, independent of the frontend.
 * Each test uses unique usernames, so tests are parallel-safe and order-independent.
 */

const REGISTERED = { message: 'registration successful' };

/** Malformed / incomplete payloads; the same table drives register and login. */
const REQUIRED_FIELD_PAYLOADS: Array<{ name: string; payload: () => Record<string, unknown> | undefined }> = [
  { name: 'no body at all', payload: () => undefined },
  { name: '{}', payload: () => ({}) },
  { name: 'username only', payload: () => ({ username: uniqueUsername() }) },
  { name: 'password only', payload: () => ({ password: validPassword() }) },
  { name: 'empty username', payload: () => ({ username: '', password: validPassword() }) },
  { name: 'empty password', payload: () => ({ username: uniqueUsername(), password: '' }) },
  { name: 'whitespace-only username', payload: () => ({ username: '   ', password: validPassword() }) },
  { name: 'username is a number', payload: () => ({ username: 12345, password: validPassword() }) },
  { name: 'password is a number', payload: () => ({ username: uniqueUsername(), password: 12345678 }) },
  { name: 'username is null', payload: () => ({ username: null, password: validPassword() }) },
  { name: 'password is null', payload: () => ({ username: uniqueUsername(), password: null }) },
];

test.describe('Credential validation - POST /api/register (API)', () => {
  test.describe('[CV-20] username boundary (30 characters) @boundary', () => {
    test('30 characters -> 201', async ({ request }) => {
      const response = await registerViaApi(request, { username: uniqueUsername(30), password: validPassword() });
      expect(response.status()).toBe(201);
      expect(await response.json()).toEqual(REGISTERED);
    });

    test('31 characters -> 400', async ({ request }) => {
      const response = await registerViaApi(request, { username: uniqueUsername(31), password: validPassword() });
      await expectApiError(response, 400, API_ERRORS.usernameMax30);
    });
  });

  test.describe('[CV-21] password byte boundary (72 UTF-8 bytes) @boundary @multibyte', () => {
    const rows: Array<{ name: string; recipe: PasswordRecipe; bytes: number }> = [
      { name: 'ascii x 72', recipe: { ascii: 72 }, bytes: 72 },
      { name: 'ascii x 73', recipe: { ascii: 73 }, bytes: 73 },
      { name: '"é" x 36', recipe: { unit: 'é', count: 36 }, bytes: 72 },
      { name: '"é" x 37', recipe: { unit: 'é', count: 37 }, bytes: 74 },
      { name: '"€" x 24', recipe: { unit: '€', count: 24 }, bytes: 72 },
      { name: '"€" x 25', recipe: { unit: '€', count: 25 }, bytes: 75 },
      { name: '"😀" x 18', recipe: { unit: '😀', count: 18 }, bytes: 72 },
      { name: '"😀" x 19', recipe: { unit: '😀', count: 19 }, bytes: 76 },
      { name: 'ascii x 70 + "é"', recipe: { ascii: 70, unit: 'é', count: 1 }, bytes: 72 },
      { name: 'ascii x 71 + "é"', recipe: { ascii: 71, unit: 'é', count: 1 }, bytes: 73 },
    ];
    for (const { name, recipe, bytes } of rows) {
      const accepted = bytes <= 72;
      test(`${name} (${bytes} bytes) -> ${accepted ? 201 : 400}`, async ({ request }) => {
        const password = passwordWithBytes(recipe, bytes);
        const response = await registerViaApi(request, { username: uniqueUsername(), password });
        if (accepted) {
          expect(response.status()).toBe(201);
          expect(await response.json()).toEqual(REGISTERED);
        } else {
          await expectApiError(response, 400, API_ERRORS.passwordMax72);
        }
      });
    }
  });

  test.describe('[CV-22] minimum password length (8 characters) @boundary', () => {
    test('7 characters -> 400', async ({ request }) => {
      const response = await registerViaApi(request, { username: uniqueUsername(), password: randomAscii(7) });
      await expectApiError(response, 400, API_ERRORS.passwordMin8);
    });

    test('8 characters -> 201', async ({ request }) => {
      const response = await registerViaApi(request, { username: uniqueUsername(), password: randomAscii(8) });
      expect(response.status()).toBe(201);
      expect(await response.json()).toEqual(REGISTERED);
    });
  });

  test.describe('[CV-23] missing or malformed required fields @negative', () => {
    for (const { name, payload } of REQUIRED_FIELD_PAYLOADS) {
      test(name, async ({ request }) => {
        await expectApiError(await postAuth(request, 'register', payload()), 400, API_ERRORS.required);
      });
    }
  });

  test.describe('[CV-24] first failing rule wins (validation order) @negative', () => {
    test('31-char username + empty password -> required', async ({ request }) => {
      const response = await registerViaApi(request, { username: uniqueUsername(31), password: '' });
      await expectApiError(response, 400, API_ERRORS.required);
    });

    test('31-char username + 7-char password -> username error', async ({ request }) => {
      const response = await registerViaApi(request, { username: uniqueUsername(31), password: randomAscii(7) });
      await expectApiError(response, 400, API_ERRORS.usernameMax30);
    });

    test('31-char username + 73-byte password -> username error', async ({ request }) => {
      const response = await registerViaApi(request, { username: uniqueUsername(31), password: randomAscii(73) });
      await expectApiError(response, 400, API_ERRORS.usernameMax30);
    });
  });

  test('[CV-25] a rejected registration does not create the account @negative', async ({ request }) => {
    const username = uniqueUsername();
    const rejected = await registerViaApi(request, { username, password: randomAscii(73) });
    await expectApiError(rejected, 400, API_ERRORS.passwordMax72);

    const password = validPassword();
    const retry = await registerViaApi(request, { username, password });
    expect(retry.status(), 'username must still be free (201, not 409)').toBe(201);

    const login = await loginViaApi(request, { username, password });
    expect(login.status()).toBe(200);
    expect((await login.json()).token).toEqual(expect.any(String));
  });
});

test.describe('Credential validation - POST /api/login (API)', () => {
  test('[CV-30] valid credentials return a token @smoke @happy-path', async ({ request }) => {
    const creds = await seedUser(request);
    const response = await loginViaApi(request, creds);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('login successful');
    expect(body.token).toEqual(expect.any(String));
    expect(body.token.length).toBeGreaterThan(0);
  });

  test.describe('[CV-31] accounts registered at the 72-byte cap log in with the full password @happy-path @multibyte', () => {
    const rows: Array<{ name: string; recipe: PasswordRecipe }> = [
      { name: 'ascii x 72', recipe: { ascii: 72 } },
      { name: '"é" x 36', recipe: { unit: 'é', count: 36 } },
      { name: '"😀" x 18', recipe: { unit: '😀', count: 18 } },
    ];
    for (const { name, recipe } of rows) {
      test(name, async ({ request }) => {
        const creds = await seedUser(request, { password: passwordWithBytes(recipe, 72) });
        const response = await loginViaApi(request, creds);
        expect(response.status()).toBe(200);
        expect((await response.json()).token).toEqual(expect.any(String));
      });
    }
  });

  test.describe('[CV-32] failures stay 401 with an identical body @negative', () => {
    test('existing user, wrong password', async ({ request }) => {
      const { username } = await seedUser(request);
      const response = await loginViaApi(request, { username, password: validPassword() });
      await expectApiError(response, 401, API_ERRORS.invalidCredentials);
    });

    test('unknown user', async ({ request }) => {
      const response = await loginViaApi(request, { username: uniqueUsername(), password: validPassword() });
      await expectApiError(response, 401, API_ERRORS.invalidCredentials);
    });
  });

  test.describe('[CV-33] password byte boundary (512 UTF-8 bytes) @boundary @multibyte', () => {
    // 401 means "passed validation and reached authentication"; 400 means "rejected before bcrypt".
    const rows: Array<{ name: string; recipe: PasswordRecipe; bytes: number }> = [
      { name: 'ascii x 100 (over the register cap, still fine on login)', recipe: { ascii: 100 }, bytes: 100 },
      { name: 'ascii x 512', recipe: { ascii: 512 }, bytes: 512 },
      { name: 'ascii x 513', recipe: { ascii: 513 }, bytes: 513 },
      { name: '"é" x 256', recipe: { unit: 'é', count: 256 }, bytes: 512 },
      { name: '"é" x 257', recipe: { unit: 'é', count: 257 }, bytes: 514 },
      { name: '"€" x 170', recipe: { unit: '€', count: 170 }, bytes: 510 },
      { name: '"€" x 171', recipe: { unit: '€', count: 171 }, bytes: 513 },
      { name: '"😀" x 128', recipe: { unit: '😀', count: 128 }, bytes: 512 },
      { name: '"😀" x 129', recipe: { unit: '😀', count: 129 }, bytes: 516 },
      { name: 'ascii x 511 + "é"', recipe: { ascii: 511, unit: 'é', count: 1 }, bytes: 513 },
    ];
    for (const { name, recipe, bytes } of rows) {
      const passesValidation = bytes <= 512;
      test(`${name} (${bytes} bytes) -> ${passesValidation ? 401 : 400}`, async ({ request }) => {
        const password = passwordWithBytes(recipe, bytes);
        const response = await loginViaApi(request, { username: uniqueUsername(), password });
        if (passesValidation) {
          await expectApiError(response, 401, API_ERRORS.invalidCredentials);
        } else {
          await expectApiError(response, 400, API_ERRORS.passwordMax512);
        }
      });
    }
  });

  test.describe('[CV-34] username boundary (255 characters) @boundary', () => {
    // Register caps usernames at 30, so a >30-char account cannot be created through the API;
    // a 401 here proves the request passed validation and reached authentication.
    for (const length of [31, 255]) {
      test(`${length} characters -> 401`, async ({ request }) => {
        const response = await loginViaApi(request, { username: uniqueUsername(length), password: validPassword() });
        await expectApiError(response, 401, API_ERRORS.invalidCredentials);
      });
    }

    test('256 characters -> 400', async ({ request }) => {
      const response = await loginViaApi(request, { username: uniqueUsername(256), password: validPassword() });
      await expectApiError(response, 400, API_ERRORS.usernameMax255);
    });
  });

  test.describe('[CV-35] missing or malformed required fields @negative', () => {
    const names = [
      'no body at all',
      '{}',
      'username only',
      'password only',
      'empty username',
      'empty password',
      'whitespace-only username',
      'username is a number',
      'password is null',
    ];
    for (const { name, payload } of REQUIRED_FIELD_PAYLOADS.filter((row) => names.includes(row.name))) {
      test(name, async ({ request }) => {
        await expectApiError(await postAuth(request, 'login', payload()), 400, API_ERRORS.required);
      });
    }
  });

  test('[CV-36] required-field errors take precedence over length errors @negative', async ({ request }) => {
    const response = await loginViaApi(request, { username: uniqueUsername(256), password: '' });
    await expectApiError(response, 400, API_ERRORS.required);
  });
});
