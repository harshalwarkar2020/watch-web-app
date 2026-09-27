import { useEffect, useState } from 'react'
import { me } from '../api/authClient'
import { useAuth } from '../auth/useAuth'

export function AuthenticatedView() {
  const { token, clearToken, setSessionError } = useAuth()
  const [username, setUsername] = useState(null)

  useEffect(() => {
    let cancelled = false

    me(token).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setUsername(result.data.username)
      } else {
        setSessionError(result.error)
        clearToken()
      }
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div>
      <p>{username ? `Logged in as ${username}` : 'Loading...'}</p>
      <button onClick={clearToken}>Logout</button>
    </div>
  )
}
