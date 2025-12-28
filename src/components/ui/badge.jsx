export function Badge({ className = "", children, variant = "default", ...props }) {
  const base =
    "inline-flex items-center rounded-full border text-xs font-semibold px-3 py-1 transition-colors";
  const styles =
    variant === "secondary"
      ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30"
      : "bg-[color:var(--card)] text-[color:var(--text)] border-[color:var(--border)]";
  return (
    <span className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </span>
  );
}

export default Badge;
