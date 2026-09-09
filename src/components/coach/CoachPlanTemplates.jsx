import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Button from "../ui/button";

const LEVELS = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

const normalizeSearch = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();

const isRecentTemplate = (template) => {
  const timestamp = new Date(
    template.updatedAt || template.createdAt || 0,
  ).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= 30 * 24 * 60 * 60 * 1000;
};

const getTemplateReadiness = (template) => {
  const trainingDays = (template.weeklySchedule || []).filter(
    (day) => day.type === "training",
  );
  const configured = trainingDays.filter((day) => day.sourceRoutineId).length;
  return {
    trainingDays,
    configured,
    ready: trainingDays.length > 0 && configured === trainingDays.length,
  };
};

export default function CoachPlanTemplates({
  templates,
  processingId,
  onCreate,
  onOpen,
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const recentCount = templates.filter(isRecentTemplate).length;
  const visibleTemplates = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return templates.filter((template) => {
      if (filter === "recent" && !isRecentTemplate(template)) return false;
      if (!normalizedQuery) return true;
      return normalizeSearch(
        `${template.name || ""} ${template.goal || ""} ${LEVELS[template.level] || ""}`,
      ).includes(normalizedQuery);
    });
  }, [filter, query, templates]);

  if (!templates.length) {
    return (
      <section className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-14 text-center sm:py-20">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-[1.25rem] bg-[color:var(--surface-subtle)]">
          <CalendarDays className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-xl font-bold tracking-[-0.035em]">
          Crea tu primera plantilla
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[color:var(--text-muted)]">
          Configura una estructura una sola vez para reutilizarla con distintos
          alumnos.
        </p>
        <Button
          className="mt-6 h-12 gap-2 rounded-full px-5"
          onClick={onCreate}
        >
          <Plus className="h-4 w-4" /> Nueva plantilla
        </Button>
      </section>
    );
  }

  return (
    <section className="mt-4 pb-24 sm:pb-0">
      <div className="grid grid-cols-[minmax(0,1fr)_56px] items-center gap-3">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[color:var(--text-muted)]"
            strokeWidth={1.65}
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar plantilla"
            className="theme-accent-focus h-14 w-full rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--card)] pl-14 pr-4 text-[16px] outline-none placeholder:text-[color:var(--text-muted)]"
          />
        </label>
        <button
          type="button"
          onClick={onCreate}
          className="grid h-14 w-14 place-items-center rounded-full bg-[#171817] text-white transition active:scale-[0.97] dark:bg-[#e2ff00] dark:text-black"
          aria-label="Crear plantilla"
        >
          <Plus className="h-6 w-6" strokeWidth={1.8} />
        </button>
      </div>

      <div
        className="mt-4 flex gap-2"
        role="tablist"
        aria-label="Filtrar plantillas"
      >
        {[
          { id: "all", label: "Todas", count: templates.length },
          { id: "recent", label: "Recientes", count: recentCount },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={`min-h-12 rounded-full px-5 text-[14px] font-semibold transition ${
              filter === item.id
                ? "bg-[#171817] text-white dark:bg-[#e2ff00] dark:text-black"
                : "bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]"
            }`}
          >
            {item.label} <span className="ml-1 opacity-75">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-7 flex items-center justify-between gap-3 px-1">
        <h2 className="text-[25px] font-bold tracking-[-0.045em]">
          Plantillas de planes
        </h2>
        <span
          className="grid h-10 w-10 place-items-center rounded-full text-[color:var(--text)]"
          aria-label={`${visibleTemplates.length} plantillas`}
        >
          <SlidersHorizontal className="h-5 w-5" strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleTemplates.map((template) => {
          const id = String(template._id || template.id);
          const { trainingDays, configured, ready } =
            getTemplateReadiness(template);
          return (
            <button
              key={id}
              type="button"
              disabled={processingId === id}
              onClick={() => onOpen(template)}
              className="grid min-h-[142px] w-full grid-cols-[88px_minmax(0,1fr)_24px] items-center gap-4 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left shadow-[0_8px_24px_rgba(25,25,25,0.035)] transition active:scale-[0.99] disabled:opacity-60"
            >
              <span className="grid h-[80px] w-[80px] place-items-center rounded-[1.15rem] bg-[color:var(--surface-subtle)] text-[color:var(--text)]">
                <Dumbbell className="h-9 w-9" strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-[17px] font-bold tracking-[-0.025em]">
                  {template.name}
                </strong>
                <span className="mt-1 block truncate text-[14px] text-[color:var(--text-muted)]">
                  {LEVELS[template.level] || template.level} ·{" "}
                  {template.durationWeeks} semanas
                </span>
                <span className="mt-2 flex items-center gap-2 text-[13px] text-[color:var(--text-muted)]">
                  <CalendarDays className="h-4 w-4" strokeWidth={1.7} />
                  {ready
                    ? `${configured} rutinas configuradas`
                    : `${configured} de ${trainingDays.length} rutinas`}
                </span>
                <span
                  className={`mt-2 inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium ${
                    ready
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                  }`}
                >
                  {ready ? (
                    <Check className="h-4 w-4 rounded-full bg-emerald-500 p-0.5 text-white" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {ready ? "Lista para asignar" : "Incompleta"}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-[color:var(--text-muted)]" />
            </button>
          );
        })}
      </div>

      {!visibleTemplates.length ? (
        <div className="mt-3 rounded-[1.4rem] border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-10 text-center">
          <p className="text-sm font-semibold">No encontramos plantillas</p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            Prueba con otro nombre o cambia el filtro.
          </p>
        </div>
      ) : null}
    </section>
  );
}
