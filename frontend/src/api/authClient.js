const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

const DEFAULT_TIMEOUT_MS = (() => {
  const rawValue = import.meta.env.VITE_AUTH_TIMEOUT_MS
  if (rawValue === undefined || rawValue === null || rawValue === '') return 9000
  const parsed = Number(rawValue)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 9000
})()

function extractError(data, rawText, res) {
  const err = data.error
  if (typeof err === 'string') return { error: err }
  if (err && typeof err.message === 'string') {
    return typeof err.code === 'string'
      ? { error: err.message, code: err.code }
      : { error: err.message }
  }
  return { error: rawText || res.statusText || 'request failed' }
}

async function parseResponse(res) {
  // Try JSON first, fallback to text for diagnostics when the body isn't JSON.
  const contentType = res.headers?.get?.('content-type') || ''
  let data = {}
  let rawText = ''

  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}))
  } else {
    rawText = await res.text().catch(() => '')
  }

  if (!res.ok) {
    return {
      ok: false,
      ...extractError(data, rawText, res),
      status: res.status,
    }
  }

  return {
    ok: true,
    data: contentType.includes('application/json') ? data : {},
  }
}

function isAbortError(err) {
  if (!err) return false
  if (err.name === 'AbortError') return true
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
  let didTimeout = false

  const timeoutId = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutMs)

  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } catch (err) {
    if (isAbortError(err) && didTimeout) {
      return { ok: false, error: 'request timed out', code: 'TIMEOUT' }
    }
    return { ok: false, error: 'request failed' }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const result = await fetchWithTimeout(url, options, timeoutMs)

  // If fetchWithTimeout returned a normalized error object, pass it through.
  if (result && typeof result.json !== 'function' && result.ok === false) {
    return result
  }

  // Otherwise it's a Response.
  return parseResponse(result)
}

export async function register(username, password) {
  return fetchJsonWithTimeout(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
}

export async function login(username, password) {
  return fetchJsonWithTimeout(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
}

export async function me(token) {
  return fetchJsonWithTimeout(`${BASE_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
