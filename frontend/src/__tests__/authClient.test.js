import { register, login, me } from '../api/authClient'

// Real Response objects, so behavior matches the browser (a non-2xx Response has ok === false).
function mockFetchOnce({ status, body }) {

  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

describe('authClient', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('register() returns ok:true with data on success', async () => {
    mockFetchOnce({ status: 201, body: { message: 'registration successful' } })
    const result = await register('alice', 'password1')
    expect(result).toEqual({ ok: true, data: { message: 'registration successful' } })
  })

  it('register() returns ok:false with the server error on failure', async () => {
    mockFetchOnce({ status: 409, body: { error: 'username already exists' } })
    const result = await register('alice', 'password1')
    expect(result).toEqual({ ok: false, error: 'username already exists', status: 409 })
  })

  it('register() surfaces a 400 validation message from the server', async () => {
    mockFetchOnce({ status: 400, body: { error: 'password must be at most 72 bytes' } })
    const result = await register('alice', 'x')
    expect(result).toEqual({
      ok: false,
      error: 'password must be at most 72 bytes',
      status: 400,
    })
  })

  it('login() returns ok:true with the token on success', async () => {
    mockFetchOnce({ status: 200, body: { token: 'jwt-token', message: 'login successful' } })
    const result = await login('alice', 'password1')
    expect(result).toEqual({
      ok: true,
      data: { token: 'jwt-token', message: 'login successful' },
    })
  })

  it('login() returns ok:false with the server error on failure', async () => {
    mockFetchOnce({ status: 401, body: { error: 'invalid credentials' } })
    const result = await login('alice', 'wrong')
    expect(result).toEqual({ ok: false, error: 'invalid credentials', status: 401 })
  })

  it('me() sends the bearer token and returns ok:true on success', async () => {
    mockFetchOnce({ status: 200, body: { username: 'alice' } })
    const result = await me('jwt-token')
    expect(result).toEqual({ ok: true, data: { username: 'alice' } })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/me'),
      expect.objectContaining({ headers: { Authorization: 'Bearer jwt-token' } })
    )
  })

  it('me() returns the message and code from a standardized auth error', async () => {
    mockFetchOnce({
      status: 401,
      body: { error: { code: 'AUTH_INVALID', message: 'Invalid token' } },
    })
    const result = await me('bad-token')
    expect(result).toEqual({ ok: false, error: 'missing or invalid token', status: 401 })
  })

  it('falls back to the response text when an error body is not JSON', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' }))
    const result = await login('alice', 'password1')
    expect(result).toEqual({ ok: false, error: 'Bad Gateway', status: 502 })
  })

  it('returns "request failed" when fetch rejects (network error)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const result = await login('alice', 'password1')
    expect(result).toEqual({ ok: false, error: 'request failed' })
  })

  it('returns a TIMEOUT error when the request exceeds the timeout', async () => {
    vi.useFakeTimers()
    global.fetch = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          )
        })
    )

    const pending = login('alice', 'password1')
    await vi.advanceTimersByTimeAsync(9000)

    await expect(pending).resolves.toEqual({
      ok: false,
      error: 'request timed out',
      code: 'TIMEOUT',
    expect(result).toEqual({
      ok: false,
      error: 'Invalid token',
      code: 'AUTH_INVALID',
      status: 401,
    })
  })

  it('me() surfaces AUTH_EXPIRED for an expired token', async () => {
    mockFetchOnce({
      status: 401,
      body: { error: { code: 'AUTH_EXPIRED', message: 'Token expired' } },
    })
    const result = await me('old-token')
    expect(result).toEqual({
      ok: false,
      error: 'Token expired',
      code: 'AUTH_EXPIRED',
      status: 401,
    })
  })
})
