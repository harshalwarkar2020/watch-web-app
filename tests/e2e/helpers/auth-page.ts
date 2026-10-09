import { expect, type Locator, type Page, type Response } from '@playwright/test';

type FormKind = 'login' | 'register';

/**
 * Page object for one auth form. All locators are role/label based and scoped to the
 * form (by its aria-label) so the session-error alert and the switch-view buttons
 * cannot be confused with the form's own controls.
 */
export class AuthForm {
  readonly root: Locator;
  readonly username: Locator;
  readonly password: Locator;
  readonly submitButton: Locator;
  readonly switchViewButton: Locator;
  /** Client-side or server error, rendered as <p role="alert">. */
  readonly alert: Locator;
  /** Success message, rendered as <p role="status">. */
  readonly status: Locator;

  constructor(
    private readonly page: Page,
    readonly kind: FormKind,
  ) {
    const isLogin = kind === 'login';
    this.root = page.getByRole('form', { name: isLogin ? 'Login form' : 'Registration form' });
    this.username = this.root.getByLabel('Username');
    this.password = this.root.getByLabel('Password', { exact: true });
    this.submitButton = this.root.getByRole('button', { name: isLogin ? 'Login' : 'Register', exact: true });
    this.switchViewButton = this.root.getByRole('button', { name: isLogin ? 'Register' : 'Login', exact: true });
    this.alert = this.root.getByRole('alert');
    this.status = this.root.getByRole('status');
  }

  async fill(username: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async fillAndSubmit(username: string, password: string): Promise<void> {
    await this.fill(username, password);
    await this.submit();
  }
}

/** Open the app at its default view and return the (visible) login form. */
export async function openLoginForm(page: Page): Promise<AuthForm> {
  await page.goto('/');
  const form = new AuthForm(page, 'login');
  await expect(form.root).toBeVisible();
  return form;
}

/** Open the app and switch to the registration view. */
export async function openRegistrationForm(page: Page): Promise<AuthForm> {
  const login = await openLoginForm(page);
  await login.switchViewButton.click();
  const form = new AuthForm(page, 'register');
  await expect(form.root).toBeVisible();
  return form;
}

/**
 * Count POSTs to /api/register and /api/login made by the page, without altering them.
 * Install BEFORE submitting. Used to prove client-side blocking ("no network request").
 * (Non-POST traffic such as CORS preflights is passed through and not counted.)
 */
export async function trackAuthPosts(page: Page): Promise<{ readonly count: number; readonly paths: string[] }> {
  const paths: string[] = [];
  await page.route(/\/api\/(register|login)$/, async (route) => {
    if (route.request().method() === 'POST') paths.push(new URL(route.request().url()).pathname);
    await route.continue();
  });
  return {
    get count() {
      return paths.length;
    },
    paths,
  };
}

/** Promise for the POST response of an auth endpoint. Create BEFORE the click that triggers it. */
export function waitForAuthResponse(page: Page, endpoint: 'register' | 'login'): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/${endpoint}`,
  );
}
