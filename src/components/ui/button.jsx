import { forwardRef } from "react";

const base =
  "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-200 disabled:opacity-80 disabled:cursor-not-allowed";

const variants = {
  default: "bg-blue-600 text-white hover:bg-blue-700",
  outline:
    "border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)] hover:border-blue-300 hover:text-[color:var(--text)]",
  ghost: "text-[color:var(--text)] hover:bg-[color:var(--card)]",
};

const sizes = {
  default: "h-11 px-4",
  sm: "h-9 px-3 text-xs",
  icon: "h-10 w-10",
};

export const Button = forwardRef(function Button(
  { className = "", variant = "default", size = "default", asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? "span" : "button";
  const variantClass = variants[variant] || variants.default;
  const sizeClass = sizes[size] || sizes.default;
  return <Comp ref={ref} className={`${base} ${variantClass} ${sizeClass} ${className}`} {...props} />;
});

export default Button;
