import { ArrowRight, Timer } from "lucide-react";

const formatDuration = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const getRoutineName = (training) =>
  training?.selectedRoutine?.name ||
  training?.routineName ||
  "Rutina seleccionada";

function ActiveTrainingTopbar({ training, onReturn }) {
  if (!training) return null;

  const duration = formatDuration(training.elapsed || 0);
  const routineName = getRoutineName(training);
  const statusLabel = training.isRunning ? "En curso" : "Pausado";
  const contextLabel = training.athleteName
    ? `Entrenando a ${training.athleteName}`
    : routineName;

  return (
    <div
      data-active-training-banner
      className="sticky top-0 z-50 w-full border-b border-[color:var(--border)] bg-[color:var(--bg)]/96 shadow-sm backdrop-blur"
    >
      <button
        type="button"
        onClick={onReturn}
        className="group mx-auto flex min-h-14 w-full max-w-md items-center gap-2 px-3 py-2 text-left md:hidden"
        aria-label="Volver al entrenamiento en curso"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] text-[#352018] shadow-sm dark:text-[#e2ff00]">
          <Timer className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-condensed text-[10px] font-black uppercase tracking-[0.14em] text-[#352018] dark:text-[#e2ff00]">
            Entrenamiento en curso
          </span>
          <span className="mt-0.5 block truncate text-xs font-bold text-[color:var(--text)]">
            {contextLabel}
          </span>
        </span>
        <span className="inline-flex h-9 shrink-0 items-center rounded-xl bg-[color:var(--card)] px-2 font-mono text-xs font-black text-[color:var(--text)]">
          {duration}
        </span>
        <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl bg-[#352018] px-2.5 text-[10px] font-black uppercase text-white transition-colors group-hover:bg-[#482b20] dark:bg-[#e2ff00] dark:text-black dark:group-hover:bg-[#cbe600]">
          Volver
          <ArrowRight className="h-3.5 w-3.5 stroke-[3]" />
        </span>
      </button>

      <div className="hidden min-h-[76px] items-center gap-5 bg-[color:var(--card)]/95 px-5 py-3 md:flex md:px-8">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#352018] text-white dark:bg-[#e2ff00] dark:text-black">
          <Timer className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-condensed text-[10px] font-black uppercase tracking-[0.14em] text-[#352018] dark:text-[#e2ff00]">
            Entrenamiento en curso
          </p>
          <p className="mt-0.5 truncate font-condensed text-xl font-black uppercase leading-none text-[color:var(--text)]">
            {routineName}
          </p>
          {training.athleteName ? (
            <p className="mt-1 truncate text-xs text-[color:var(--text-muted)]">
              Entrenando a {training.athleteName}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 border-l border-[color:var(--border)] pl-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Duración
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-[24px] leading-none text-[color:var(--text)]">
              {duration}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                training.isRunning
                  ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
                  : "bg-[color:var(--bg)] text-[color:var(--text-muted)]"
              }`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onReturn}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-[#352018] px-4 text-sm font-black text-white transition-colors hover:bg-[#482b20] dark:bg-[#e2ff00] dark:text-black dark:hover:bg-[#cbe600]"
        >
          Volver al entrenamiento
          <ArrowRight className="h-4 w-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}

export default ActiveTrainingTopbar;
