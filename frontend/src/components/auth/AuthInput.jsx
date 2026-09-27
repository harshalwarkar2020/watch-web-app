export function AuthInput({ id, label, type = 'text', value, onChange }) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        className="auth-input"
      />
    </div>
  )
}
