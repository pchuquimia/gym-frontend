export function Badge({
  className = "",
  children,
  variant = "default",
  ...props
}) {
  const base =
    "inline-flex items-center rounded-full border text-xs font-semibold px-3 py-1 transition-colors";
  const variants = {
    default:
      "bg-[color:var(--card)] text-[color:var(--text)] border-[color:var(--border)]",
    secondary:
      "border-[#ffd0c2] bg-[#fff0eb] text-[#b82f05] dark:border-[#e2ff00]/30 dark:bg-[#e2ff00]/10 dark:text-[#e2ff00]",
    active:
      "border-[#ff5722] bg-[#fff0eb] text-[#c52d00] dark:border-[#e2ff00] dark:bg-[#1d2100] dark:text-[#e2ff00]",
    completed:
      "border-[#ff5722] bg-[#ff5722] text-white dark:border-[#e2ff00] dark:bg-[#e2ff00] dark:text-black",
  };
  const styles = variants[variant] || variants.default;
  return (
    <span className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </span>
  );
}

export default Badge;
