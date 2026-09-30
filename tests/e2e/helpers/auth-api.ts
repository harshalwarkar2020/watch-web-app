import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { uniqueUsername, validPassword } from './credentials';

/** Backend base URL. Override with E2E_API_URL. */
export const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';

export interface Credentials {
  username: string;
  password: string;
}

/**
 * Raw POST to the backend. `data` is intentionally loosely typed so specs can send
 * malformed payloads (numbers, nulls, missing fields) to prove server-side enforcement.
 */
export function postAuth(
  request: APIRequestContext,
  endpoint: 'register' | 'login',
  data?: Record<string, unknown>,
): Promise<APIResponse> {
  return request.post(`${API_URL}/api/${endpoint}`, { data });
}

export const registerViaApi = (request: APIRequestContext, creds: Credentials) =>
  postAuth(request, 'register', { ...creds });

export const loginViaApi = (request: APIRequestContext, creds: Credentials) =>
  postAuth(request, 'login', { ...creds });

/** Create a fresh account through the API (fast, UI-independent) and return its credentials. */
export async function seedUser(request: APIRequestContext, overrides: Partial<Credentials> = {}): Promise<Credentials> {
  const creds: Credentials = {
    username: overrides.username ?? uniqueUsername(),
    password: overrides.password ?? validPassword(),
  };
  const response = await registerViaApi(request, creds);
  expect(response.status(), `seeding ${creds.username} failed: ${await response.text()}`).toBe(201);
  return creds;
}

/** Assert a 400 response with the exact `{ error }` body and JSON content type. */
export async function expectApiError(response: APIResponse, status: number, message: string): Promise<void> {
  expect(response.status()).toBe(status);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(await response.json()).toEqual({ error: message });
}
