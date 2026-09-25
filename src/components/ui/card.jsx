export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`ui-card rounded-card border border-[color:var(--border)] bg-[color:var(--surface)] shadow-soft ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }) {
  return (
    <div
      className={`ui-card__header flex items-start justify-between gap-4 p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }) {
  return (
    <div className={`ui-card__content p-5 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }) {
  return (
    <div
      className={`ui-card__footer flex items-center gap-3 border-t border-[color:var(--border)] p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
