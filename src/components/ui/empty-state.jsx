import { Inbox } from "lucide-react";

export default function EmptyState({
  action,
  className = "",
  description,
  icon: Icon = Inbox,
  title,
}) {
  return (
    <section
      className={`grid min-h-52 place-items-center rounded-card border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface)] p-6 text-center ${className}`}
    >
      <div className="max-w-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--surface-subtle)] text-[color:var(--text-muted)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-xl font-bold text-[color:var(--text)]">{title}</h3>
        {description ? (
          <p className="mt-2 font-sans text-sm leading-6 text-[color:var(--text-muted)]">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </section>
  );
}
