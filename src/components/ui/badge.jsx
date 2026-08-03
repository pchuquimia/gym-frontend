export function Badge({
  className = "",
  children,
  variant = "default",
  ...props
}) {
  const base =
    "inline-flex items-center rounded-full border text-xs font-semibold px-3 py-1 transition-colors";
  const styles =
    variant === "secondary"
      ? "border-[#ffd0c2] bg-[#fff0eb] text-[#b82f05] dark:border-[#e2ff00]/30 dark:bg-[#e2ff00]/10 dark:text-[#e2ff00]"
      : "bg-[color:var(--card)] text-[color:var(--text)] border-[color:var(--border)]";
  return (
    <span className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </span>
  );
}

export default Badge;
