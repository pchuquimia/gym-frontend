import { Check } from "lucide-react";

export default function ChoiceCard({ selected, title, description, ...props }) {
  return (
    <button
      type="button"
      data-choice-card
      {...props}
      className={`flex min-h-[4.5rem] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        selected
          ? "border-[color:var(--text)] bg-[color:var(--text)] text-[color:var(--card)] shadow-sm"
          : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)] hover:border-[color:var(--border-strong)]"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">
          {title}
        </span>
        <span
          className={`mt-1 block text-xs leading-snug ${selected ? "text-[color:var(--card)] opacity-70" : "text-[color:var(--text-muted)]"}`}
        >
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${selected ? "border-[color:var(--card)] bg-[color:var(--card)] text-[color:var(--text)]" : "border-[color:var(--border-strong)] text-transparent"}`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    </button>
  );
}
