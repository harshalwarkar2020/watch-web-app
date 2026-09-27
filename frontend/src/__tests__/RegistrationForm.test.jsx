import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RegistrationForm } from '../components/RegistrationForm'
import * as authClient from '../api/authClient'

describe('RegistrationForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('submits valid fields and shows the success message', async () => {
    vi.spyOn(authClient, 'register').mockResolvedValue({
      ok: true,
      data: { message: 'registration successful' },
    })

    render(<RegistrationForm />)
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(authClient.register).toHaveBeenCalledWith('alice', 'password1')
    await waitFor(() =>
      expect(screen.getByText('registration successful')).toBeInTheDocument()
    )
  })

  it('shows the server error message on failure (e.g. duplicate username)', async () => {
    vi.spyOn(authClient, 'register').mockResolvedValue({
      ok: false,
      error: 'username already exists',
    })

    render(<RegistrationForm />)
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() =>
      expect(screen.getByText('username already exists')).toBeInTheDocument()
    )
  })

  it('does not call register() and shows a validation message when a field is empty', () => {
    vi.spyOn(authClient, 'register')

    render(<RegistrationForm />)
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(authClient.register).not.toHaveBeenCalled()
    expect(screen.getByText('Username and password are required')).toBeInTheDocument()
  })
})
