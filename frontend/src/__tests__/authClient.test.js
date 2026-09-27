import { register, login, me } from '../api/authClient'

function mockFetchOnce({ status, body }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
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
    expect(result).toEqual({ ok: false, error: 'username already exists' })
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
    expect(result).toEqual({ ok: false, error: 'invalid credentials' })
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

  it('me() returns ok:false on an invalid token', async () => {
    mockFetchOnce({ status: 401, body: { error: 'missing or invalid token' } })
    const result = await me('bad-token')
    expect(result).toEqual({ ok: false, error: 'missing or invalid token' })
  })
})
