import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginForm } from '../components/LoginForm'
import { AuthProvider } from '../auth/AuthContext'
import { useAuth } from '../auth/useAuth'
import * as authClient from '../api/authClient'

function TokenDisplay() {
  const { token } = useAuth()
  return <span data-testid="current-token">{token ?? 'none'}</span>
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <LoginForm />
      <TokenDisplay />
    </AuthProvider>
  )
}

describe('LoginForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs in successfully, shows the success message, and stores the token in context', async () => {
    vi.spyOn(authClient, 'login').mockResolvedValue({
      ok: true,
      data: { token: 'jwt-abc', message: 'login successful' },
    })

    renderWithAuth()
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(authClient.login).toHaveBeenCalledWith('alice', 'password1')
    await waitFor(() => expect(screen.getByText('login successful')).toBeInTheDocument())
    expect(screen.getByTestId('current-token')).toHaveTextContent('jwt-abc')
  })

  it('shows the server error on wrong password / unknown username and does not set a token', async () => {
    vi.spyOn(authClient, 'login').mockResolvedValue({
      ok: false,
      error: 'invalid credentials',
    })

    renderWithAuth()
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => expect(screen.getByText('invalid credentials')).toBeInTheDocument())
    expect(screen.getByTestId('current-token')).toHaveTextContent('none')
  })

  it('does not call login() and shows a validation message when a field is empty', () => {
    vi.spyOn(authClient, 'login')

    renderWithAuth()
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(authClient.login).not.toHaveBeenCalled()
    expect(screen.getByText('Username and password are required')).toBeInTheDocument()
  })

  it('submits a username longer than 30 characters, since login is looser than register', async () => {
    vi.spyOn(authClient, 'login').mockResolvedValue({ ok: false, error: 'invalid credentials' })
    const longUsername = 'a'.repeat(31)

    renderWithAuth()
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: longUsername } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => expect(authClient.login).toHaveBeenCalledWith(longUsername, 'password1'))
  })

  it('blocks a login password over 512 bytes without calling login()', () => {
    vi.spyOn(authClient, 'login')

    renderWithAuth()
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'é'.repeat(257) } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(authClient.login).not.toHaveBeenCalled()
    expect(screen.getByText('Password must be at most 512 bytes')).toBeInTheDocument()
  })
})
