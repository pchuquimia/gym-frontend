export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
