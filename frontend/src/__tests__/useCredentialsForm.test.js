import { renderHook, act } from '@testing-library/react'
import { useCredentialsForm } from '../hooks/useCredentialsForm'

async function submit(result, username, password) {
  act(() => {
    result.current.setUsername(username)
    result.current.setPassword(password)
  })
  await act(async () => {
    await result.current.handleSubmit({ preventDefault: () => {} })
  })
}

describe('useCredentialsForm validation', () => {
  it('rejects a username over 30 characters without calling submitFn', async () => {
    const submitFn = vi.fn()
    const { result } = renderHook(() => useCredentialsForm(submitFn))

    await submit(result, 'a'.repeat(31), 'password1')

    expect(submitFn).not.toHaveBeenCalled()
    expect(result.current.isError).toBe(true)
    expect(result.current.message).toBe('Username must be at most 30 characters')
  })

  it('accepts a username of exactly 30 characters', async () => {
    const submitFn = vi.fn().mockResolvedValue({ ok: true, data: { message: 'ok' } })
    const { result } = renderHook(() => useCredentialsForm(submitFn))

    await submit(result, 'a'.repeat(30), 'password1')

    expect(submitFn).toHaveBeenCalledWith('a'.repeat(30), 'password1')
  })

  it('rejects a password over maxPasswordBytes measured in UTF-8 bytes, not characters', async () => {
    const submitFn = vi.fn()
    const { result } = renderHook(() => useCredentialsForm(submitFn, { maxPasswordBytes: 72 }))

    // 37 two-byte characters = 37 chars but 74 bytes
    await submit(result, 'alice', 'é'.repeat(37))

    expect(submitFn).not.toHaveBeenCalled()
    expect(result.current.isError).toBe(true)
    expect(result.current.message).toBe('Password must be at most 72 bytes')
  })

  it('accepts a password of exactly maxPasswordBytes bytes', async () => {
    const submitFn = vi.fn().mockResolvedValue({ ok: true, data: { message: 'ok' } })
    const { result } = renderHook(() => useCredentialsForm(submitFn, { maxPasswordBytes: 72 }))

    await submit(result, 'alice', 'é'.repeat(36))

    expect(submitFn).toHaveBeenCalled()
  })

  it('does not enforce a password byte cap when maxPasswordBytes is not provided', async () => {
    const submitFn = vi.fn().mockResolvedValue({ ok: true, data: { message: 'ok' } })
    const { result } = renderHook(() => useCredentialsForm(submitFn))

    await submit(result, 'alice', 'a'.repeat(1000))

    expect(submitFn).toHaveBeenCalled()
  })
})
