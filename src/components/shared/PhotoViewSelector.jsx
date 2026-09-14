const DEFAULT_VIEWS = [
  { value: "front", label: "Frontal", marker: "F" },
  { value: "side", label: "Lateral", marker: "L" },
  { value: "back", label: "Posterior", marker: "P" },
  { value: "other", label: "Otra", marker: "+" },
];

export default function PhotoViewSelector({
  value,
  onChange,
  multiple = false,
  label = "Vista corporal",
  hint = "Mantén las mismas vistas para comparar el progreso.",
  options = DEFAULT_VIEWS,
}) {
  const selectedValues = new Set(
    multiple ? (Array.isArray(value) ? value : []) : [value],
  );

  const selectView = (view) => {
    if (!multiple) {
      onChange(view);
      return;
    }

    const current = Array.isArray(value) ? value : [];
    if (current.includes(view)) {
      // Una tarea de fotos sin ninguna vista seleccionada no sería accionable.
      if (current.length === 1) return;
      onChange(current.filter((item) => item !== view));
      return;
    }
    onChange([...current, view]);
  };

  return (
    <fieldset>
      {label ? (
        <div className="mb-3">
          <legend className="text-sm font-semibold text-[color:var(--text)]">
            {label}
          </legend>
          {hint ? (
            <p className="mt-0.5 text-xs leading-4 text-[color:var(--text-muted)]">
              {hint}
            </p>
          ) : null}
        </div>
      ) : null}
      <div
        className="grid grid-cols-4 gap-1 rounded-[1rem] bg-[color:var(--surface-subtle)] p-1"
        role="group"
        aria-label={label || "Vista corporal"}
      >
        {options.map((option) => {
          const selected = selectedValues.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => selectView(option.value)}
              aria-pressed={selected}
              className={`theme-accent-focus relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[0.75rem] px-1.5 py-1.5 text-center transition-[background-color,color,transform] active:scale-[0.98] ${
                selected
                  ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)] shadow-[var(--shadow-xs)]"
                  : "text-[color:var(--text-muted)] hover:bg-[color:var(--card)] hover:text-[color:var(--text)]"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${
                  selected
                    ? "bg-[color:var(--accent-contrast)]/12 text-[color:var(--accent-contrast)]"
                    : "bg-[color:var(--card)] text-[color:var(--text-muted)]"
                }`}
                aria-hidden="true"
              >
                {option.marker || option.label?.[0] || "+"}
              </span>
              <strong className="block text-[11px] font-semibold leading-tight">
                {option.label}
              </strong>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
