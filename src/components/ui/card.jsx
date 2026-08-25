export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-card border border-[color:var(--border)] bg-[color:var(--surface)] shadow-soft ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }) {
  return (
    <div className={`flex items-start justify-between gap-4 p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }) {
  return (
    <div className={`p-5 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }) {
  return (
    <div className={`flex items-center gap-3 border-t border-[color:var(--border)] p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
