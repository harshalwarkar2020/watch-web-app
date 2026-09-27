export function AuthButton({ children, type = 'button', disabled, onClick }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className="auth-button">
      {children}
    </button>
  )
}
