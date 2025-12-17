const muscles = [
  'Todos',
  'Pecho',
  'Espalda',
  'Piernas',
  'Triceps',
  'Biceps',
  'Femoral',
  'Cuadricep',
  'Pantorrillas',
  'Gluteo',
  'Abdominales',
  'Hombros',
  'Core',
  'Full Body',
]

function FilterBar({ search, onSearch, activeFilter, onFilter, branch, onBranch }) {
  return (
    <div className="card flex flex-col gap-3 overflow-visible">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <input
          type="text"
          className="w-full px-3 py-3 rounded-lg border border-border-soft bg-white/5 text-white placeholder:text-muted"
          placeholder="Buscar ejercicio..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <select
          className="px-3 py-3 rounded-lg border border-border-soft bg-white/5 text-sm text-white"
          value={branch}
          onChange={(e) => onBranch(e.target.value)}
        >
          <option value="todos">Todas las sedes</option>
          <option value="sopocachi">Sopocachi</option>
          <option value="miraflores">Miraflores</option>
          <option value="general">General</option>
        </select>
      </div>
      <div className="flex gap-2 flex-nowrap overflow-x-auto pb-1 -mx-1 px-1">
        {muscles.map((muscle) => (
          <button
            key={muscle}
            type="button"
            className={`px-3 py-2 rounded-full border text-sm font-semibold whitespace-nowrap ${
              activeFilter === muscle
                ? 'bg-accent/20 border-accent/50 text-white'
                : 'border-border-soft text-muted hover:text-white hover:border-accent/40'
            }`}
            onClick={() => onFilter(muscle)}
          >
            {muscle}
          </button>
        ))}
        <button
          type="button"
          className="px-3 py-2 rounded-full border text-sm font-semibold border-border-soft text-muted hover:text-white hover:border-accent/40 whitespace-nowrap"
          onClick={() => {
            onFilter('Todos')
            onBranch('todos')
            onSearch('')
          }}
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  )
}

export default FilterBar
