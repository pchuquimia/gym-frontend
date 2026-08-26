import { forwardRef } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-control font-sans text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0";

const variants = {
  default:
    "border border-transparent bg-[color:var(--accent)] text-[color:var(--accent-contrast)] shadow-soft hover:bg-[color:var(--accent-hover)]",
  accentOutline:
    "border border-[color:var(--accent)] bg-transparent text-[color:var(--accent-strong)] hover:bg-[color:var(--accent)] hover:text-[color:var(--accent-contrast)]",
  accentSolid:
    "border border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)] shadow-soft hover:bg-[color:var(--accent-hover)] disabled:!opacity-100",
  outline:
    "border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] shadow-soft hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-subtle)]",
  ghost:
    "border border-transparent text-[color:var(--text)] hover:bg-[color:var(--surface-subtle)]",
  destructive:
    "border border-transparent bg-[color:var(--danger)] text-white shadow-soft hover:brightness-95",
  destructiveOutline:
    "border border-[color:var(--danger)] bg-transparent text-[color:var(--danger)] hover:bg-[color:var(--danger-soft)]",
};

const sizes = {
  default: "h-11 px-4",
  sm: "h-9 px-3 text-xs",
  lg: "h-12 px-5 text-base",
  icon: "h-11 w-11 p-0",
  touchIcon: "h-11 w-11 p-0",
};

export const Button = forwardRef(function Button(
  {
    className = "",
    variant = "default",
    size = "default",
    asChild = false,
    ...props
  },
  ref,
) {
  const Comp = asChild ? "span" : "button";
  const variantClass = variants[variant] || variants.default;
  const sizeClass = sizes[size] || sizes.default;
  return (
    <Comp
      ref={ref}
      className={`${base} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    />
  );
});

export default Button;
