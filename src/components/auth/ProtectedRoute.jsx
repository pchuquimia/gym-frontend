import { useAuth } from "../../context/AuthContext";
import Login from "../../pages/Login";

export default function ProtectedRoute({ children, onNavigate }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[color:var(--bg)] text-[color:var(--text)]">
        <div className="text-sm text-[color:var(--text-muted)]">
          Cargando sesión...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onNavigate={onNavigate} />;
  }

  return children;
}
