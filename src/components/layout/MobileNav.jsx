import { navLinks } from './Sidebar'

const icons = {
  dashboard: '🏠',
  library: '📚',
  registrar: '📝',
  historial: '📈',
  graficos: '📊',
  rutinas: '📅',
  perfil: '👤',
  fotos: '🖼️',
}

function MobileNav({ activePage, onNavigate }) {
  const items = ['dashboard', 'library', 'historial', 'graficos', 'perfil']
  return (
    <nav className="md:hidden bg-bg-darker border-t border-border-soft px-4 py-2">
      <div className="grid grid-cols-5 text-xs text-muted">
        {items.map((id) => {
          const link = navLinks.find((l) => l.id === id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate?.(id)}
              className={`flex flex-col items-center gap-1 py-1 ${activePage === id ? 'text-accent' : ''}`}
            >
              <span className="text-lg leading-none">{icons[id] || '•'}</span>
              <span className="truncate">{link?.label?.split(' ')[0] || id}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNav
