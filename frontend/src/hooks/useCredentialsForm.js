import { useState } from 'react'

// Shared state/validation/submit flow behind both the Login and
// Registration forms, which otherwise duplicated this logic identically
// apart from which API function they call.
export function useCredentialsForm(
  submitFn,
  { maxUsernameLength = 30, maxPasswordBytes } = {}
) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [isError, setIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!username.trim() || !password) {
      setIsError(true)
      setMessage('Username and password are required')
      return undefined
    }

    if (username.length > maxUsernameLength) {
      setIsError(true)
      setMessage(`Username must be at most ${maxUsernameLength} characters`)
      return undefined
    }

    if (maxPasswordBytes && new TextEncoder().encode(password).length > maxPasswordBytes) {
      setIsError(true)
      setMessage(`Password must be at most ${maxPasswordBytes} bytes`)
      return undefined
    }

    setIsSubmitting(true)
    const result = await submitFn(username, password)
    setIsSubmitting(false)

    if (result.ok) {
      setIsError(false)
      setMessage(result.data.message)
    } else {
      setIsError(true)
      setMessage(result.error)
    }

    return result
  }

  return {
    username,
    setUsername,
    password,
    setPassword,
    message,
    isError,
    isSubmitting,
    handleSubmit,
  }
}
