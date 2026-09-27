import { register } from '../api/authClient'
import { useCredentialsForm } from '../hooks/useCredentialsForm'
import { AuthCard } from './auth/AuthCard'
import { AuthInput } from './auth/AuthInput'
import { AuthButton } from './auth/AuthButton'

export function RegistrationForm({ onSwitchView = () => {} }) {
  const {
    username,
    setUsername,
    password,
    setPassword,
    message,
    isError,
    isSubmitting,
    handleSubmit,
  } = useCredentialsForm(register)

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} aria-label="Registration form" className="auth-form">
        <h2 className="auth-heading">Register for Book the Watch</h2>

        <AuthInput
          id="register-username"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <AuthInput
          id="register-password"
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
          Register
        </AuthButton>

        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" className="auth-link" onClick={onSwitchView}>
            Login
          </button>
        </p>
      </form>
    </AuthCard>
  )
}
