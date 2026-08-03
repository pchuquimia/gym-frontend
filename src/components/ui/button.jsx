import { forwardRef } from "react";

const base =
  "font-condensed inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ff5722]/35 dark:focus-visible:ring-[#e2ff00]/40 disabled:opacity-80 disabled:cursor-not-allowed";

const variants = {
  default:
    "bg-[#ff5722] text-white hover:bg-[#df3f0d] dark:bg-[#e2ff00] dark:text-black dark:hover:bg-[#cbe600]",
  outline:
    "border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)] hover:border-[#ff5722] hover:text-[color:var(--text)] dark:hover:border-[#e2ff00]",
  ghost: "text-[color:var(--text)] hover:bg-[color:var(--card)]",
};

const sizes = {
  default: "h-11 px-4",
  sm: "h-9 px-3 text-xs",
  icon: "h-10 w-10",
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
