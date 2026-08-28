import { useEffect } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { Clock3, Flame, Gauge, Info, Scale, X } from "lucide-react";

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

  const weight = estimates.find((item) => item?.weightKg)?.weightKg || 0;
  const intensity =
    estimates.length === 1
      ? estimates[0]?.intensityLabel
      : summary?.met >= 5.35
        ? "Alta"
        : summary?.met >= 4.25
          ? "Media-alta"
          : "Moderada";

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calorie-estimate-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="max-h-[90dvh] w-full overflow-hidden rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4 sm:p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
              {periodLabel}
            </p>
            <h2
              id="calorie-estimate-title"
              className="mt-1 text-xl font-black text-[color:var(--text)]"
            >
              Calorías activas
            </h2>
            <p className="mt-1 max-w-md text-xs font-semibold leading-relaxed text-[color:var(--text-muted)]">
              Estimación del trabajo efectivo y los descansos registrados.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
            aria-label="Cerrar detalle de calorías activas"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[calc(90dvh-112px)] overflow-y-auto p-4 sm:p-5">
          <section className="border-b border-[color:var(--border)] pb-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  Total estimado
                </p>
                <p className="mt-1 text-4xl font-black tracking-tight text-[color:var(--text)]">
                  ~{summary?.calories || 0}{" "}
                  <span className="text-lg">kcal</span>
                </p>
                <p className="mt-1 text-xs font-bold text-[color:var(--text-muted)]">
                  Rango probable: {summary?.minCalories || 0}–
                  {summary?.maxCalories || 0} kcal
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--accent-strong)] dark:rounded-[4px]">
                <Flame className="h-5 w-5" />
              </span>
            </div>
          </section>

          <section className="mt-4 grid grid-cols-3 divide-x divide-[color:var(--border)] border-y border-[color:var(--border)] py-4">
            <div className="px-2 first:pl-0">
              <Clock3 className="h-4 w-4 text-[color:var(--accent-strong)]" />
              <p className="mt-2 text-sm font-black text-[color:var(--text)]">
                {formatDuration(summary?.durationMinutes)}
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase text-[color:var(--text-muted)]">
                Tiempo calculado
              </p>
            </div>
            <div className="px-3">
              <Scale className="h-4 w-4 text-[color:var(--accent-strong)]" />
              <p className="mt-2 text-sm font-black text-[color:var(--text)]">
                {weight ? `${weight} kg` : "Referencia"}
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase text-[color:var(--text-muted)]">
                Peso usado
              </p>
            </div>
            <div className="px-3 pr-0">
              <Gauge className="h-4 w-4 text-[color:var(--accent-strong)]" />
              <p className="mt-2 text-sm font-black text-[color:var(--text)]">
                {intensity || "Moderada"}
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase text-[color:var(--text-muted)]">
                Intensidad
              </p>
            </div>
          </section>

          {estimates.length ? (
            <section className="mt-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-[color:var(--text)]">
                    {estimates.length > 1
                      ? "Por entrenamiento"
                      : "Datos de la sesión"}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--text-muted)]">
                    El descanso se calcula con una intensidad menor que las
                    series.
                  </p>
                </div>
                <span className="text-[10px] font-black text-[color:var(--accent-strong)]">
                  {summary?.completedSets || 0} series
                </span>
              </div>
              <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                {estimates.map((item, index) => (
                  <article
                    key={item.id || `${item.date}-${index}`}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[color:var(--text)]">
                        {item.routineName || "Entrenamiento"}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold capitalize text-[color:var(--text-muted)]">
                        {formatDate(item.date)} ·{" "}
                        {formatDuration(item.durationMinutes)} ·{" "}
                        {item.intensityLabel}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black text-[color:var(--accent-strong)]">
                        ~{item.calories} kcal
                      </p>
                      <p className="text-[9px] font-semibold text-[color:var(--text-muted)]">
                        {item.minCalories}–{item.maxCalories}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-5 border-l-2 border-[color:var(--accent)] pl-3">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-strong)]" />
              <div>
                <h3 className="text-xs font-black text-[color:var(--text)]">
                  Cómo se obtiene
                </h3>
                <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[color:var(--text-muted)]">
                  Las series se calculan como trabajo de fuerza y los descansos
                  con una intensidad ligera. Se descuenta el gasto basal y no
                  se cuentan la preparación, el tiempo sin clasificar ni las
                  pausas manuales.
                </p>
                {summary?.usesReferenceWeight ? (
                  <p className="mt-2 text-[10px] font-black text-[color:var(--warning)]">
                    No encontramos tu peso: se usó una referencia de 75 kg.
                    Registra tu peso para personalizarlo.
                  </p>
                ) : null}
                {summary?.durationWasEstimated ? (
                  <p className="mt-2 text-[10px] font-black text-[color:var(--warning)]">
                    Una sesión no tenía duración registrada; se estimó a partir
                    de sus series completadas.
                  </p>
                ) : null}
                {summary?.breakdownWasEstimated ? (
                  <p className="mt-2 text-[10px] font-black text-[color:var(--warning)]">
                    En alguna sesión el trabajo efectivo se normalizó a partir
                    de sus series completadas.
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
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
