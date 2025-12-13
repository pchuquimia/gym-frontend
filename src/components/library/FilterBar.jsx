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

function FilterBar({ search, onSearch, activeFilter, onFilter }) {
  return (
    <div className="card flex flex-col gap-3">
      <input
        type="text"
        className="w-full px-3 py-3 rounded-lg border border-border-soft bg-white/5 text-white placeholder:text-muted"
        placeholder="Buscar ejercicio..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {muscles.map((muscle) => (
          <button
            key={muscle}
            type="button"
            className={`px-3 py-2 rounded-full border text-sm font-semibold ${
              activeFilter === muscle
                ? 'bg-accent/20 border-accent/50 text-white'
                : 'border-border-soft text-muted hover:text-white hover:border-accent/40'
            }`}
            onClick={() => onFilter(muscle)}
          >
            {muscle}
          </button>
        ))}
      </div>
    </div>
  )
}

export default FilterBar
