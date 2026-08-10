import { useAuth } from "../../context/AuthContext";
import Login from "../../pages/Login";
import OperationLoader from "../system/OperationLoader";

export default function ProtectedRoute({ children, onNavigate }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <OperationLoader
        active
        delayMs={250}
        title="Conectando con el servidor"
        description="Estamos verificando tu sesion."
      />
    );
  }

  if (!isAuthenticated) {
    return <Login onNavigate={onNavigate} />;
  }

  return children;
}
