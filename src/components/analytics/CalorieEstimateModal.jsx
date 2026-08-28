import { useEffect } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { ArrowLeft } from "lucide-react";

const formatDate = (value) => {
  if (!value) return "Sesión registrada";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("es-BO", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
};

const formatDuration = (minutes = 0) => {
  const rounded = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return hours ? `${hours} h${rest ? ` ${rest} min` : ""}` : `${rest} min`;
};

export default function CalorieEstimateModal({
  open,
  onClose,
  summary,
  estimates = [],
  periodLabel = "Sesión",
}) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="calorie-estimate-detail fixed inset-0 z-[110] overflow-y-auto bg-[color:var(--card)] text-[color:var(--text)]"
      role="dialog"
      aria-modal="true"
      aria-label="Calorías activas"
    >
      <section className="mx-auto min-h-[100dvh] w-full max-w-xl bg-[color:var(--card)]">
        <header className="calorie-estimate-detail__header sticky top-0 z-10 grid grid-cols-[2.75rem_1fr_2.75rem] items-center border-b border-[color:var(--detail-row-divider)] bg-[color:var(--card)] px-[var(--mobile-page-gutter)]">
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center text-[color:var(--text)] transition active:scale-95"
            aria-label="Cerrar detalle de calorías activas"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={1.9} />
          </button>
          <h2
            id="calorie-estimate-title"
            className="text-center text-lg font-medium tracking-[-0.025em]"
          >
              Calorías activas
          </h2>
          <span aria-hidden="true" />
        </header>

        <main className="px-[var(--mobile-page-gutter)] pb-8 pt-5">
          <section className="border-b border-[color:var(--detail-row-divider)] pb-5">
            <p className="text-xs font-normal text-[color:var(--text-muted)]">
              {periodLabel}
            </p>
            <p className="mt-1 text-4xl font-medium tracking-[-0.04em] tabular-nums">
              {summary?.calories || 0}{" "}
              <span className="text-lg font-normal">cal</span>
            </p>
            <p className="mt-1 text-xs font-normal text-[color:var(--text-muted)]">
              Rango estimado: {summary?.minCalories || 0}–
              {summary?.maxCalories || 0} cal
            </p>
          </section>

          <section className="grid grid-cols-2 border-b border-[color:var(--detail-row-divider)] py-4">
            <div className="pr-4">
              <p className="text-xs font-normal text-[color:var(--text-muted)]">
                Tiempo
              </p>
              <p className="mt-1 text-lg font-medium tabular-nums">
                {formatDuration(summary?.durationMinutes || 0)}
              </p>
            </div>
            <div className="border-l border-[color:var(--detail-row-divider)] pl-4">
              <p className="text-xs font-normal text-[color:var(--text-muted)]">
                Entrenamientos
              </p>
              <p className="mt-1 text-lg font-medium tabular-nums">
                {estimates.length}
              </p>
            </div>
          </section>

          {estimates.length ? (
            <section className="pt-5">
              <h3 className="text-base font-medium tracking-[-0.015em]">
                {estimates.length > 1 ? "Por entrenamiento" : "Entrenamiento"}
              </h3>
              <div className="mt-2 divide-y divide-[color:var(--detail-row-divider)] border-y border-[color:var(--detail-row-divider)]">
                {estimates.map((item, index) => (
                  <article
                    key={item.id || `${item.date}-${index}`}
                    className="flex min-h-16 items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.routineName || "Entrenamiento"}
                      </p>
                      <p className="mt-1 text-xs font-normal capitalize text-[color:var(--text-muted)]">
                        {formatDate(item.date)} · {formatDuration(item.durationMinutes)}
                      </p>
                    </div>
                    <strong className="shrink-0 text-sm font-medium tabular-nums">
                      {item.calories} cal
                    </strong>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-5 border-t border-[color:var(--detail-row-divider)] pt-4">
            <p className="text-xs font-normal leading-5 text-[color:var(--text-muted)]">
              Estimación basada en tu trabajo efectivo y los descansos
              registrados.
            </p>
            {summary?.usesReferenceWeight ? (
              <p className="mt-2 text-xs font-medium text-[color:var(--warning)]">
                Registra tu peso para obtener un cálculo más personalizado.
              </p>
            ) : null}
          </section>
        </main>
      </section>
    </div>,
    document.body,
  );
}

const estimateType = PropTypes.shape({
  id: PropTypes.string,
  date: PropTypes.string,
  routineName: PropTypes.string,
  calories: PropTypes.number,
  minCalories: PropTypes.number,
  maxCalories: PropTypes.number,
  durationMinutes: PropTypes.number,
  workMinutes: PropTypes.number,
  restMinutes: PropTypes.number,
  excludedMinutes: PropTypes.number,
  completedSets: PropTypes.number,
  intensityLabel: PropTypes.string,
  weightKg: PropTypes.number,
  breakdownWasEstimated: PropTypes.bool,
});

CalorieEstimateModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  summary: estimateType,
  estimates: PropTypes.arrayOf(estimateType),
  periodLabel: PropTypes.string,
};
