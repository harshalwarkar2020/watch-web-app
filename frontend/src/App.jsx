import { useState } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import { RegistrationForm } from './components/RegistrationForm'
import { LoginForm } from './components/LoginForm'
import { AuthenticatedView } from './components/AuthenticatedView'
import { AppHeader } from './components/layout/AppHeader'
import './styles/auth.css'

function AppShell() {
  const { token, sessionError } = useAuth()
  const [view, setView] = useState('login')

  const subtitle = token ? 'Account' : view === 'login' ? 'Login' : 'Register'

  return (
    <div className="page-background">
      <AppHeader subtitle={subtitle} />
      <main className="page-content">
        {token ? (
          <div className="app-authenticated">
            <AuthenticatedView />
          </div>
        ) : (
          <div className="auth-page-content">
            {sessionError && (
              <p role="alert" className="auth-session-error">
                {sessionError}
              </p>
            )}
            {view === 'login' ? (
              <LoginForm onSwitchView={() => setView('register')} />
            ) : (
              <RegistrationForm onSwitchView={() => setView('login')} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App
