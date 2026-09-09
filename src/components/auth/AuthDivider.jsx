export default function AuthDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-[color:var(--auth-border)]" />
      <span className="font-sans text-xs font-medium lowercase text-[color:var(--auth-muted)]">
        o
      </span>
      <span className="h-px flex-1 bg-[color:var(--auth-border)]" />
    </div>
  );
}
