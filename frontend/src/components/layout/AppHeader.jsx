export function AppHeader({ subtitle }) {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <span className="app-status-dot" aria-hidden="true" />
        <strong className="app-name">Book the Watch</strong>
        {subtitle && (
          <>
            <span className="app-header-separator" aria-hidden="true">
              |
            </span>
            <span className="app-header-subtitle">{subtitle}</span>
          </>
        )}
      </div>
    </header>
  )
}
