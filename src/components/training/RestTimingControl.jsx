import { Timer } from "lucide-react";

const REST_DURATION_OPTIONS = [
  { seconds: 120, label: "2 min" },
  { seconds: 180, label: "3 min" },
  { seconds: 240, label: "4 min" },
  { seconds: 300, label: "5 min" },
];

export default function RestTimingControl({
  enabled,
  durationSeconds,
  onToggle,
  onDurationChange,
  compact = false,
  className = "",
}) {
  return (
    <section
      className={`${
        compact
          ? "rounded-xl px-3 py-2"
          : "rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4"
      } ${className}`.trim()}
      aria-label="Configuración de los tiempos de descanso"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`grid shrink-0 place-items-center rounded-full ${
              compact
                ? "h-7 w-7 text-[color:var(--text-muted)]"
                : "h-10 w-10 bg-[color:var(--card)] text-[color:var(--text)] shadow-sm"
            }`}
          >
            <Timer className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <strong className="block text-sm font-semibold text-[color:var(--text)]">
              Tiempos de descanso
            </strong>
            {!compact ? (
              <span className="mt-0.5 block text-xs leading-5 text-[color:var(--text-muted)]">
                {enabled
                  ? "El descanso se inicia al completar cada serie."
                  : "Registra tus series sin temporizador automático."}
              </span>
            ) : null}
          </span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Usar tiempos de descanso"
          onClick={() => onToggle(!enabled)}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-[color:var(--focus-ring)] ${
            enabled
              ? "border-[#181918] bg-[#181918] dark:border-[#e2ff00] dark:bg-[#e2ff00]"
              : "border-[color:var(--border)] bg-[color:var(--card)] shadow-inner"
          }`}
        >
          <span
            className={`absolute left-1 top-1 h-[1.125rem] w-[1.125rem] rounded-full bg-white shadow-sm transition-transform dark:bg-[#111] ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {enabled ? (
        <div
          className={`mt-3 grid grid-cols-4 gap-1.5 ${compact ? "pl-10" : ""}`}
          aria-label="Duración del descanso"
        >
          {REST_DURATION_OPTIONS.map(({ seconds, label }) => (
            <button
              key={seconds}
              type="button"
              onClick={() => onDurationChange(seconds)}
              aria-pressed={durationSeconds === seconds}
              className={`h-9 rounded-lg px-1 text-xs font-semibold tabular-nums transition-colors ${
                durationSeconds === seconds
                  ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black"
                  : "bg-[color:var(--card)] text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
