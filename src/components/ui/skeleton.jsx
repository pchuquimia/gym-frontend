function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-card bg-[color:var(--surface-subtle)] ${className}`}
    />
  );
}

export default Skeleton;
