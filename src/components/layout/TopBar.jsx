function TopBar({ title, subtitle, ctaLabel, onCta }) {
  return (
    <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      {ctaLabel && (
        <div className="flex gap-2">
          <button className="primary-btn" onClick={onCta}>
            {ctaLabel}
          </button>
        </div>
      )}
    </header>
  )
}

export default TopBar
