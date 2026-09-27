import { useState } from 'react'

// Shared state/validation/submit flow behind both the Login and
// Registration forms, which otherwise duplicated this logic identically
// apart from which API function they call.
export function useCredentialsForm(submitFn) {
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
