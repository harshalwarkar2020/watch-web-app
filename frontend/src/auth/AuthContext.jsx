import { useState } from 'react'
import { AuthContext } from './context'

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null)
  const [sessionError, setSessionError] = useState(null)

  const setToken = (newToken) => {
    setTokenState(newToken)
    setSessionError(null)
  }
  const clearToken = () => setTokenState(null)

  return (
    <AuthContext.Provider
      value={{ token, setToken, clearToken, sessionError, setSessionError }}
    >
      {children}
    </AuthContext.Provider>
  )
}
