import { useState } from "react";
import { Dumbbell } from "lucide-react";
import Button from "../components/ui/button";
import { useAuth } from "../context/AuthContext";

const roleHome = (role) => {
  if (role === "Admin") return "dashboard";
  if (role === "Entrenador") return "rutinas";
  return "perfil";
};

export default function Login({ onNavigate = () => {} }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const user = await login(form);
      onNavigate(roleHome(user?.role));
    } catch (_err) {
      setError("Credenciales inválidas");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[color:var(--bg)] px-4 text-[color:var(--text)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 shadow-lg"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Iniciar sesión</h1>
            <p className="text-sm text-[color:var(--text-muted)]">
              Accede a tu entrenamiento.
            </p>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/25"
          />
        </label>

        <label className="mt-4 block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Contraseña
          </span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/25"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <Button type="submit" className="mt-5 w-full" disabled={submitting}>
          {submitting ? "Ingresando..." : "Ingresar"}
        </Button>

        <button
          type="button"
          onClick={() => onNavigate("register")}
          className="mt-4 w-full text-center text-sm text-blue-600 hover:underline"
        >
          Crear cuenta
        </button>
      </form>
    </main>
  );
}
