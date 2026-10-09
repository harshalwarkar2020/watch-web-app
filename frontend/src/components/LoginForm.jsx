import { login } from '../api/authClient'
import { useAuth } from '../auth/useAuth'
import { useCredentialsForm } from '../hooks/useCredentialsForm'
import { AuthCard } from './auth/AuthCard'
import { AuthInput } from './auth/AuthInput'
import { AuthButton } from './auth/AuthButton'

export function LoginForm({ onSwitchView = () => {} }) {
  const { setToken } = useAuth()
  const {
    username,
    setUsername,
    password,
    setPassword,
    message,
    isError,
    isSubmitting,
    handleSubmit,
  } = useCredentialsForm(login, { maxUsernameLength: 255, maxPasswordBytes: 512 })

  const onSubmit = async (event) => {
    const result = await handleSubmit(event)
    if (result?.ok) {
      setToken(result.data.token)
    }
  }

  return (
    <AuthCard>
      <form onSubmit={onSubmit} aria-label="Login form" className="auth-form">
        <h2 className="auth-heading">Log In to Book the Watch</h2>

        <AuthInput
          id="login-username"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <AuthInput
          id="login-password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {message && (
          <p className="auth-message" role={isError ? 'alert' : 'status'}>
            {message}
          </p>
        )}

        <AuthButton type="submit" disabled={isSubmitting}>
          Login
        </AuthButton>

        <p className="auth-switch">
          Don&apos;t have an account?{' '}
          <button type="button" className="auth-link" onClick={onSwitchView}>
            Register
          </button>
        </p>
      </form>
    </AuthCard>
  )
}
