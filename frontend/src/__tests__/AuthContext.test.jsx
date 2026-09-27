import { render, screen, fireEvent } from '@testing-library/react'
import { AuthProvider } from '../auth/AuthContext'
import { useAuth } from '../auth/useAuth'

function TestConsumer() {
  const { token, setToken, clearToken } = useAuth()
  return (
    <div>
      <span data-testid="token">{token ?? 'none'}</span>
      <button onClick={() => setToken('jwt-abc')}>set</button>
      <button onClick={clearToken}>clear</button>
    </div>
  )
}

describe('AuthContext', () => {
  it('starts with no token, and setToken/clearToken update state', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('token')).toHaveTextContent('none')

    fireEvent.click(screen.getByText('set'))
    expect(screen.getByTestId('token')).toHaveTextContent('jwt-abc')

    fireEvent.click(screen.getByText('clear'))
    expect(screen.getByTestId('token')).toHaveTextContent('none')
  })

  it('throws when useAuth is called outside an AuthProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    )
    consoleErrorSpy.mockRestore()
  })
})
