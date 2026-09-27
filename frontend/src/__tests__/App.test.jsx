import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders without crashing, starting on the Login view', () => {
    render(<App />)
    expect(screen.getByText('Book the Watch')).toBeInTheDocument()
    expect(screen.getByLabelText('Login form')).toBeInTheDocument()
  })

  it('switches to the Registration view and back', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(screen.getByLabelText('Registration form')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    expect(screen.getByLabelText('Login form')).toBeInTheDocument()
  })
})
