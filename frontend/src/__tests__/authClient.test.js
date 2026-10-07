import { register, login, me } from '../api/authClient'

function mockFetchOnce({ status, body }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  })
}

describe('authClient', () => {
  afterEach(() => {
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
