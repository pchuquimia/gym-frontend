import {
  CalendarDays,
  Copy,
  Dumbbell,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Button from "../ui/button";

const LEVELS = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

export default function CoachPlanTemplates({
  templates,
  routines,
  processingId,
  onCreate,
  onOpen,
  onEdit,
  onDuplicate,
  onArchive,
}) {
  const routineNames = new Map(
    routines.map((routine) => [
      String(routine._id || routine.id),
      routine.name,
    ]),
  );

  if (!templates.length) {
    return (
      <section className="border-y border-[color:var(--border)] py-14 text-center sm:py-20">
        <CalendarDays className="theme-accent-text mx-auto h-8 w-8" />
        <h2 className="mt-4 text-lg font-black">
          Crea tu primera planificacion
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[color:var(--text-muted)]">
          Define la estructura y las rutinas una sola vez para reutilizarla con
          tus atletas.
        </p>
        <Button className="mt-5 h-11 gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" /> Nueva planificacion
        </Button>
      </section>
    );
  }

  return (
    <section className="mt-5 grid gap-3 pb-24 sm:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] sm:gap-4 sm:pb-0">
      {templates.map((template) => {
        const id = String(template._id || template.id);
        const trainingDays = (template.weeklySchedule || []).filter(
          (day) => day.type === "training",
        );
        const configured = trainingDays.filter(
          (day) => day.sourceRoutineId,
        ).length;
        return (
          <article
            key={id}
            className="routines-surface relative border border-[color:var(--border)] border-t-[3px] border-t-[#352018] bg-[color:var(--card)] p-4 shadow-sm dark:border-t-[#e2ff00]"
          >
            <button
              type="button"
              onClick={() => onOpen(template)}
              className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#352018]/35 dark:focus-visible:ring-[#e2ff00]/40"
              aria-label={`Ver contenido de ${template.name}`}
            />
            <div className="pointer-events-none relative z-[1] flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 text-left">
                <span className="block text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                  Planificacion
                </span>
                <span className="mt-2 line-clamp-2 block text-xl font-black uppercase leading-tight">
                  {template.name}
                </span>
                <span className="theme-accent-text mt-2 block text-xs font-black uppercase">
                  {LEVELS[template.level] || template.level} · {template.goal}
                </span>
              </div>
              <details className="overflow-menu pointer-events-auto relative shrink-0">
                <summary
                  className="overflow-menu-trigger cursor-pointer list-none [&::-webkit-details-marker]:hidden"
                  aria-label={`Opciones de ${template.name}`}
                >
                  <MoreVertical className="h-5 w-5" />
                </summary>
                <div className="overflow-menu-panel absolute right-0 top-12 z-30 w-48">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                      onEdit(template);
                    }}
                    className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold hover:bg-[color:var(--bg)]"
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(processingId)}
                    onClick={(event) => {
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                      onDuplicate(template);
                    }}
                    className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold hover:bg-[color:var(--bg)] disabled:opacity-50"
                  >
                    <Copy className="h-4 w-4" />
                    {processingId === id ? "Duplicando..." : "Duplicar"}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(processingId)}
                    onClick={(event) => {
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                      onArchive(template);
                    }}
                    className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </button>
                </div>
              </details>
            </div>

            <div className="pointer-events-none relative z-[1] mt-4 space-y-1.5 border-y border-[color:var(--border)] py-3">
              {(template.weeklySchedule || []).slice(0, 7).map((day, index) => (
                <div
                  key={day.slotId || index}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-black text-[color:var(--text-muted)]">
                    {template.scheduleMode === "fixed"
                      ? ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"][index]
                      : `Dia ${index + 1}`}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right font-semibold">
                    {day.type === "rest"
                      ? "Descanso"
                      : day.type === "recovery"
                        ? "Recuperacion"
                        : routineNames.get(String(day.sourceRoutineId)) ||
                          day.focus ||
                          "Rutina pendiente"}
                  </span>
                </div>
              ))}
            </div>

            <div className="pointer-events-none relative z-[1] mt-3 flex items-center justify-between text-xs font-black">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 theme-accent-text" />
                {template.durationWeeks} semanas
              </span>
              <span className="inline-flex items-center gap-1.5 text-[color:var(--text-muted)]">
                <Dumbbell className="h-4 w-4" /> {configured}/
                {trainingDays.length} rutinas
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
