export const navLinks = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'library', label: 'Biblioteca de Ejercicios' },
  { id: 'registrar', label: 'Registrar Entrenamiento' },
  { id: 'historial', label: 'Historial de Progreso' },
  { id: 'graficos', label: 'Gráficos y Análisis' },
  { id: 'ejercicio_analitica', label: 'Analítica por Ejercicio' },
  { id: 'resumen_sesion', label: 'Resumen de Sesión' },
  { id: 'rutinas', label: 'Rutinas y Planificación' },
  { id: 'perfil', label: 'Perfil y Ajustes' },
  { id: 'fotos', label: 'Biblioteca de Fotos' },
]

function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="bg-bg-darker border-r border-border-soft min-h-screen px-4 py-6 flex flex-col gap-6">
      <div className="flex items-center gap-3 px-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-green text-bg-darker font-extrabold grid place-items-center">
          UA
        </div>
        <div className="flex flex-col">
          <p className="text-sm text-muted">Usuario Activo</p>
          <span className="text-xs text-muted">Miembro desde 2023</span>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {navLinks.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate?.(item.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activePage === item.id
                ? 'bg-accent/15 text-white border border-accent/40'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_rgba(79,163,255,0.6)]" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
