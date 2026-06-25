import { useAuth } from "../../context/AuthContext";

export default function RoleBasedRoute({
  children,
  roles = [],
  fallback = null,
}) {
  const { user } = useAuth();
  if (!roles.length || roles.includes(user?.role)) return children;

  return (
    fallback || (
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 text-[color:var(--text)]">
        <p className="text-lg font-semibold">403</p>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
    )
  );
}
