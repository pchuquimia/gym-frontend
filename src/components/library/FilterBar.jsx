import { Filter, Search, X } from "lucide-react";

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

const branches = [
  { value: "todos", label: "Todas" },
  { value: "general", label: "General" },
  { value: "sopocachi", label: "Sopocachi" },
  { value: "miraflores", label: "Miraflores" },
];

function FilterBar({
  search,
  onSearch,
  activeFilter,
  onFilter,
  branch,
  onBranch,
  type = "todos",
  onType = () => {},
}) {
  const hasFilters =
    search ||
    activeFilter !== "Todos" ||
    branch !== "todos" ||
    type !== "todos";

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_150px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
          <input
            type="search"
            className="h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] pl-10 pr-9 text-sm text-[color:var(--text)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
          {search ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--card)]"
              onClick={() => onSearch("")}
              aria-label="Limpiar busqueda"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>

        <label className="relative hidden md:block">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
          <select
            className="h-11 w-full appearance-none rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] pl-10 pr-3 text-sm text-[color:var(--text)] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            value={branch}
            onChange={(event) => onBranch(event.target.value)}
          >
            {branches.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-3 gap-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-1">
          {[
            ["todos", "Todos"],
            ["system", "Catalogo"],
            ["custom", "Personal"],
          ].map(([value, label]) => {
            const active = type === value;
            return (
              <button
                key={value}
                type="button"
                className={[
                  "h-9 rounded-lg px-2 text-xs font-semibold transition",
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]",
                ].join(" ")}
                onClick={() => onType(value)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {muscles.map((muscle) => {
          const active = activeFilter === muscle;
          return (
            <button
              key={muscle}
              type="button"
              className={[
                "h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition",
                active
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text-muted)] hover:text-[color:var(--text)]",
              ].join(" ")}
              onClick={() => onFilter(muscle)}
            >
              {muscle}
            </button>
          );
        })}

        {hasFilters ? (
          <button
            type="button"
            className="h-9 shrink-0 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-xs font-semibold text-[color:var(--text)] transition hover:border-rose-300 hover:text-rose-600"
            onClick={() => {
              onFilter("Todos");
              onBranch("todos");
              onSearch("");
              onType("todos");
            }}
          >
            Limpiar
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default FilterBar;
