import { useState } from "react";
import Button from "../components/ui/button";
import { useAuth } from "../context/AuthContext";

const passwordHint =
  "Mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.";

export default function Register({ onNavigate = () => {} }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await register(form);
      onNavigate("perfil");
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[color:var(--bg)] px-4 text-[color:var(--text)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 shadow-lg"
      >
        <div className="mb-5">
          <h1 className="text-lg font-semibold">Crear cuenta</h1>
          <p className="text-sm text-[color:var(--text-muted)]">
            El registro público crea una cuenta Cliente.
          </p>
        </div>

        <div className="grid gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Nombre
            </span>
            <input
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              value={form.name}
              onChange={handleChange("name")}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/25"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Email
            </span>
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange("email")}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/25"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Contraseña
            </span>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange("password")}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/25"
            />
            <span className="text-xs text-[color:var(--text-muted)]">
              {passwordHint}
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Confirmar contraseña
            </span>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange("confirmPassword")}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/25"
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <Button type="submit" className="mt-5 w-full" disabled={submitting}>
          {submitting ? "Creando..." : "Crear cuenta"}
        </Button>

        <button
          type="button"
          onClick={() => onNavigate("login")}
          className="mt-4 w-full text-center text-sm text-blue-600 hover:underline"
        >
          Ya tengo cuenta
        </button>
      </form>
    </main>
  );
}
