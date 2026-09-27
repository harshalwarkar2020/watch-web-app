import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AuthenticatedView } from '../components/AuthenticatedView'
import { AuthProvider } from '../auth/AuthContext'
import { useAuth } from '../auth/useAuth'
import * as authClient from '../api/authClient'

function TestHarness() {
  const { setToken, token, sessionError } = useAuth()
  return (
    <div>
      <button onClick={() => setToken('jwt-abc')}>login</button>
      <span data-testid="current-token">{token ?? 'none'}</span>
      {sessionError && <span role="alert">{sessionError}</span>}
      {token && <AuthenticatedView />}
    </div>
  )
}

function renderHarness() {
  return render(
    <AuthProvider>
      <TestHarness />
    </AuthProvider>
  )
}

describe('AuthenticatedView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and displays the username on mount', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue({ ok: true, data: { username: 'alice' } })

    renderHarness()
    fireEvent.click(screen.getByText('login'))

    await waitFor(() =>
      expect(screen.getByText('Logged in as alice')).toBeInTheDocument()
    )
    expect(authClient.me).toHaveBeenCalledWith('jwt-abc')
  })

  it('clears the token via the Logout button', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue({ ok: true, data: { username: 'alice' } })

    renderHarness()
    fireEvent.click(screen.getByText('login'))
    await waitFor(() => expect(screen.getByText('Logged in as alice')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Logout'))
    expect(screen.getByTestId('current-token')).toHaveTextContent('none')
  })

  it('shows an error and clears the token when /api/me fails', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue({ ok: false, error: 'missing or invalid token' })

    renderHarness()
    fireEvent.click(screen.getByText('login'))

    await waitFor(() =>
      expect(screen.getByText('missing or invalid token')).toBeInTheDocument()
    )
    expect(screen.getByTestId('current-token')).toHaveTextContent('none')
  })
})
