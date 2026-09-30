import { test, expect, type Page, type Response } from '@playwright/test';
import { seedUser } from './helpers/auth-api';
import {
  AuthForm,
  openLoginForm,
  openRegistrationForm,
  trackAuthPosts,
  waitForAuthResponse,
} from './helpers/auth-page';
import {
  API_ERRORS,
  UI_ERRORS,
  passwordWithBytes,
  randomAscii,
  uniqueUsername,
  validPassword,
  type PasswordRecipe,
} from './helpers/credentials';

/**
 * Credential validation - browser scenarios.
 * Gherkin source: tests/e2e/features/credential-validation.feature (@ui scenarios, ids CV-01 .. CV-15).
 * Each test creates its own unique usernames, so tests are parallel-safe and order-independent.
 */

const REGISTERED = 'registration successful';

/** Submit and assert the client blocked it: exact alert text, and zero POSTs to the backend. */
async function expectBlockedOnClient(page: Page, form: AuthForm, message: string) {
  const posts = await trackAuthPosts(page);
  await form.submit();
  await expect(form.alert).toHaveText(message);
  expect(posts.count, 'no /api/register|login request may be sent when validation fails client-side').toBe(0);
}

/**
 * Assert the request reached the backend and it answered with the given status and exact { error } body.
 * We assert on the network response (not the alert) because of the known authClient defect covered by [CV-16].
 */
async function expectServerReply(response: Response, status: number, message: string) {
  expect(response.status()).toBe(status);
  expect(await response.json()).toEqual({ error: message });
}

test.describe('Credential validation - registration form (UI)', () => {
  test('[CV-01] register with valid credentials, then log in @smoke @happy-path', async ({ page }) => {
    const username = uniqueUsername();
    const password = validPassword();

    const register = await openRegistrationForm(page);
    const registerResponse = waitForAuthResponse(page, 'register');
    await register.fillAndSubmit(username, password);
    expect((await registerResponse).status()).toBe(201);
    await expect(register.status).toHaveText(REGISTERED);

    await register.switchViewButton.click();
    const login = new AuthForm(page, 'login');
    await expect(login.root).toBeVisible();
    await login.fillAndSubmit(username, password);
    await expect(page.getByText(`Logged in as ${username}`)).toBeVisible();
  });

  test.describe('[CV-02] username length boundary (30 characters) @boundary', () => {
    const cases = [
      { length: 30, accepted: true },
      { length: 31, accepted: false },
    ];
    for (const { length, accepted } of cases) {
      test(`${length} characters is ${accepted ? 'accepted' : 'blocked'}`, async ({ page }) => {
        const form = await openRegistrationForm(page);
        const username = uniqueUsername(length);
        const password = validPassword();

        if (accepted) {
          const response = waitForAuthResponse(page, 'register');
          await form.fillAndSubmit(username, password);
          expect((await response).status()).toBe(201);
          await expect(form.status).toHaveText(REGISTERED);
        } else {
          await form.fill(username, password);
          await expectBlockedOnClient(page, form, UI_ERRORS.usernameMax30);
        }
      });
    }
  });

  test('[CV-03] username limit counts characters, not bytes @boundary', async ({ page }) => {
    const form = await openRegistrationForm(page);
    const username = uniqueUsername(30, 'é');
    expect(username).toHaveLength(30);
    expect(Buffer.byteLength(username, 'utf8')).toBeGreaterThan(30);

    const response = waitForAuthResponse(page, 'register');
    await form.fillAndSubmit(username, validPassword());
    expect((await response).status()).toBe(201);
    await expect(form.status).toHaveText(REGISTERED);
  });

  test.describe('[CV-04] password byte-length boundary (72 UTF-8 bytes) @boundary @multibyte', () => {
    interface Row {
      name: string;
      recipe: PasswordRecipe;
      bytes: number;
    }
    const rows: Row[] = [
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
      test(`${name} (${bytes} bytes) is ${accepted ? 'accepted' : 'blocked'}`, async ({ page }) => {
        const password = passwordWithBytes(recipe, bytes);
        const username = uniqueUsername();
        const form = await openRegistrationForm(page);

        if (accepted) {
          const response = waitForAuthResponse(page, 'register');
          await form.fillAndSubmit(username, password);
          const result = await response;
          expect(result.status()).toBe(201);
          // The full password reached the server untouched (no client-side truncation).
          expect(result.request().postDataJSON()).toEqual({ username, password });
          await expect(form.status).toHaveText(REGISTERED);
        } else {
          await form.fill(username, password);
          await expectBlockedOnClient(page, form, UI_ERRORS.passwordMax72);
        }
      });
    }
  });

  test.describe('[CV-05] minimum password length is enforced by the server, not the client @boundary @client-gap', () => {
    test('7 characters: request IS sent and the server rejects it', async ({ page }) => {
      const form = await openRegistrationForm(page);
      const response = waitForAuthResponse(page, 'register');
      await form.fillAndSubmit(uniqueUsername(), randomAscii(7));
      await expectServerReply(await response, 400, API_ERRORS.passwordMin8);
    });

    test('8 characters: accepted', async ({ page }) => {
      const form = await openRegistrationForm(page);
      const response = waitForAuthResponse(page, 'register');
      await form.fillAndSubmit(uniqueUsername(), randomAscii(8));
      expect((await response).status()).toBe(201);
      await expect(form.status).toHaveText(REGISTERED);
    });
  });

  test.describe('[CV-06] required fields are blocked on the client @negative', () => {
    const cases = [
      { name: 'both empty', username: () => '', password: () => '' },
      { name: 'password empty', username: () => uniqueUsername(), password: () => '' },
      { name: 'username empty', username: () => '', password: () => validPassword() },
      { name: 'username whitespace only', username: () => '   ', password: () => validPassword() },
    ];
    for (const { name, username, password } of cases) {
      test(name, async ({ page }) => {
        const form = await openRegistrationForm(page);
        await form.fill(username(), password());
        await expectBlockedOnClient(page, form, UI_ERRORS.required);
      });
    }
  });
});

test.describe('Credential validation - login form (UI)', () => {
  test('[CV-10] registered user logs in with valid credentials @smoke @happy-path', async ({ page, request }) => {
    const { username, password } = await seedUser(request);
    const form = await openLoginForm(page);

    const response = waitForAuthResponse(page, 'login');
    await form.fillAndSubmit(username, password);
    expect((await response).status()).toBe(200);
    await expect(page.getByText(`Logged in as ${username}`)).toBeVisible();
  });

  test('[CV-11] wrong password is reported as invalid credentials @negative', async ({ page, request }) => {
    const { username } = await seedUser(request);
    const form = await openLoginForm(page);

    const response = waitForAuthResponse(page, 'login');
    await form.fillAndSubmit(username, validPassword());
    await expectServerReply(await response, 401, API_ERRORS.invalidCredentials);
  });

  test.describe('[CV-12] password byte-length boundary (512 UTF-8 bytes) @boundary @multibyte', () => {
    interface Row {
      name: string;
      recipe: PasswordRecipe;
      bytes: number;
    }
    const rows: Row[] = [
      { name: 'ascii x 512', recipe: { ascii: 512 }, bytes: 512 },
      { name: '"é" x 256', recipe: { unit: 'é', count: 256 }, bytes: 512 },
      { name: 'ascii x 513', recipe: { ascii: 513 }, bytes: 513 },
      { name: '"é" x 257', recipe: { unit: 'é', count: 257 }, bytes: 514 },
      { name: 'ascii x 511 + "é"', recipe: { ascii: 511, unit: 'é', count: 1 }, bytes: 513 },
    ];

    for (const { name, recipe, bytes } of rows) {
      const passesValidation = bytes <= 512;
      test(`${name} (${bytes} bytes) is ${passesValidation ? 'sent and answered 401' : 'blocked'}`, async ({ page }) => {
        const password = passwordWithBytes(recipe, bytes);
        const username = uniqueUsername(); // unknown user: a request that passes validation yields 401
        const form = await openLoginForm(page);

        if (passesValidation) {
          const response = waitForAuthResponse(page, 'login');
          await form.fillAndSubmit(username, password);
          await expectServerReply(await response, 401, API_ERRORS.invalidCredentials);
        } else {
          await form.fill(username, password);
          await expectBlockedOnClient(page, form, UI_ERRORS.passwordMax512);
        }
      });
    }
  });

  test.describe('[CV-13] username length boundary (255 characters) @boundary', () => {
    for (const length of [31, 255]) {
      test(`${length} characters is sent and answered 401`, async ({ page }) => {
        const form = await openLoginForm(page);
        const response = waitForAuthResponse(page, 'login');
        await form.fillAndSubmit(uniqueUsername(length), validPassword());
        await expectServerReply(await response, 401, API_ERRORS.invalidCredentials);
      });
    }

    test('256 characters is blocked', async ({ page }) => {
      const form = await openLoginForm(page);
      await form.fill(uniqueUsername(256), validPassword());
      await expectBlockedOnClient(page, form, UI_ERRORS.usernameMax255);
    });
  });

  test('[CV-14] passwords of 73..512 bytes are not a validation error on login @boundary', async ({ page }) => {
    const form = await openLoginForm(page);
    const response = waitForAuthResponse(page, 'login');
    await form.fillAndSubmit(uniqueUsername(), passwordWithBytes({ ascii: 100 }, 100));
    await expectServerReply(await response, 401, API_ERRORS.invalidCredentials);
  });

  test.describe('[CV-15] required fields are blocked on the client @negative', () => {
    const cases = [
      { name: 'both empty', username: () => '', password: () => '' },
      { name: 'password empty', username: () => uniqueUsername(), password: () => '' },
      { name: 'username empty', username: () => '', password: () => validPassword() },
      { name: 'username whitespace only', username: () => '   ', password: () => validPassword() },
    ];
    for (const { name, username, password } of cases) {
      test(name, async ({ page }) => {
        const form = await openLoginForm(page);
        await form.fill(username(), password());
        await expectBlockedOnClient(page, form, UI_ERRORS.required);
      });
    }
  });
});

test.describe('Credential validation - server errors surfaced in the UI (UI)', () => {
  // KNOWN DEFECT (application, not test): frontend/src/api/authClient.js#fetchJsonWithTimeout returns any
  // non-2xx fetch Response as if it were an already-normalised error ('ok' in response && !response.ok),
  // so parseResponse() never runs, result.error is undefined and the form renders no message at all.
  // test.fail() keeps CI green while the defect exists and turns RED as soon as it is fixed, which is the
  // signal to delete the annotation (the assertions below are the intended, correct behavior).
  test.describe('[CV-16] server-side rejections are shown in the alert @negative @known-defect', () => {
    test.fail(true, 'authClient drops error bodies of non-2xx responses; alert is never rendered');

    test('login: wrong password shows "invalid credentials"', async ({ page, request }) => {
      const { username } = await seedUser(request);
      const form = await openLoginForm(page);
      await form.fillAndSubmit(username, validPassword());
      await expect(form.alert).toHaveText(API_ERRORS.invalidCredentials, { timeout: 3_000 });
    });

    test('register: 7-character password shows the server message', async ({ page }) => {
      const form = await openRegistrationForm(page);
      await form.fillAndSubmit(uniqueUsername(), randomAscii(7));
      await expect(form.alert).toHaveText(API_ERRORS.passwordMin8, { timeout: 3_000 });
    });
  });
});
