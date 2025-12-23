const muscles = [
  "Todos",
  "Pecho",
  "Espalda",
  "Piernas",
  "Triceps",
  "Biceps",
  "Femoral",
  "Cuadricep",
  "Pantorrillas",
  "Gluteo",
  "Abdominales",
  "Hombros",
  "Core",
  "Full Body",
];

function FilterBar({
  search,
  onSearch,
  activeFilter,
  onFilter,
  branch,
  onBranch,
}) {
  return (
    <div className="space-y-3">
      {/* Search + Filters icon */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M16.2 16.2 21 21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <input
            type="text"
            className="
              w-full h-10 rounded-2xl
              border border-[color:var(--border)]
              bg-[color:var(--card)]
              pl-10 pr-3 text-sm
              text-[color:var(--text)]
              placeholder:text-[color:var(--text-muted)]
              outline-none focus:ring-2 focus:ring-emerald-500/25
            "
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {/* Filters button (abre/cambia branch en un futuro, por ahora mantiene tu select) */}
        <button
          type="button"
          className="
            h-10 w-10 rounded-2xl
            border border-[color:var(--border)]
            bg-[color:var(--card)]
            grid place-items-center
            text-[color:var(--text-muted)]
            hover:bg-[color:var(--bg)]
            focus:outline-none focus:ring-2 focus:ring-emerald-500/25
          "
          aria-label="Filtros"
          title="Filtros"
          onClick={() => {
            // Si luego quieres: abrir un modal con branch + otras opciones.
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path
              d="M4 7h10M18 7h2M4 17h2M10 17h10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>

      {/* Branch select compacto (si quieres ocultarlo como la imagen, lo pasamos a modal) */}
      <select
        className="
          w-full h-10 rounded-2xl
          border border-[color:var(--border)]
          bg-[color:var(--card)]
          px-3 text-sm
          text-[color:var(--text)]
          outline-none focus:ring-2 focus:ring-emerald-500/25
        "
        value={branch}
        onChange={(e) => onBranch(e.target.value)}
      >
        <option value="todos">Todas las sedes</option>
        <option value="sopocachi">Sopocachi</option>
        <option value="miraflores">Miraflores</option>
        <option value="general">General</option>
      </select>

      {/* Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {muscles.map((muscle) => {
          const active = activeFilter === muscle;
          return (
            <button
              key={muscle}
              type="button"
              className={[
                "shrink-0 h-8 px-4 rounded-full border text-xs font-semibold whitespace-nowrap transition",
                active
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-[color:var(--card)] text-[color:var(--text)] border-[color:var(--border)] hover:bg-[color:var(--bg)]",
              ].join(" ")}
              onClick={() => onFilter(muscle)}
            >
              {muscle}
            </button>
          );
        })}

        {/* Clear */}
        <button
          type="button"
          className="
            shrink-0 h-8 px-4 rounded-full border text-xs font-semibold whitespace-nowrap
            bg-[color:var(--card)] text-[color:var(--text-muted)] border-[color:var(--border)]
            hover:bg-[color:var(--bg)] hover:text-[color:var(--text)]
            transition
          "
          onClick={() => {
            onFilter("Todos");
            onBranch("todos");
            onSearch("");
          }}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}

export default FilterBar;
