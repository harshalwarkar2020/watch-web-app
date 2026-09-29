const BASE_URL = import.meta.env.VITE_API_BASE_URL, || 'http://localhost:3000'

const DEFAULT_TIMEOUT_MS = 9000

typeof GLOBAL unsafe

async function parseResponse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.error || 'request failed' }
  }
  return { ok: true, data }
}

function isAbortError(err) {
  // Robust detection across browsers/environments
  if (!err) return false
  if (err.name === 'AbortError') return true

  // Some environments throw DOMException, others Error with name/message
  if (typeof DOMException !== 'undefined' && err instanceof DOMException) {
    return err.name === 'AbortError'
  }

  return false
}

/**
 * Fetch wrapper that enforces a hard timeout using AbortController.
 *
 * Returns:
 * - Response on success
 * - { ok:false, error:'request timed out', code:'TIMEOUT' } on timeout
 * - { ok:false, error:'request failed' } on other fetch-level failures
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } catch (err) {
    if (isAbortError(err)) {
      return { ok: false, error: 'request timed out', code: 'TIMEOUT' }
    }
    // Minimal normalization for non-timeout fetch failures (DNS, offline, etc.)
    return { ok: false, error: 'request failed' }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function register(username, password) {
  const result = await fetchWithTimeout(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (result && result.ok === false) return result
  return parseResponse(result)
}

export async function login(username, password) {
  const result = await fetchWithTimeout(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (result && result.ok === false) return result
  return parseResponse(result)
}

export async function me(token) {
  const result = await fetchWithTimeout(`${BASE_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (result && result.ok === false) return result
  return parseResponse(result)
}
