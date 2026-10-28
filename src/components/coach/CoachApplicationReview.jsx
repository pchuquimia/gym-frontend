import { useState } from "react";
import { api } from "../../services/api";

export default function CoachApplicationReview({ users, onReviewed }) {
  const [reasons, setReasons] = useState({});
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const pending = users.filter(
    (user) =>
      user.role === "Cliente" && user.coachApplication?.status === "pending",
  );
  const review = async (user, decision) => {
    const id = String(user._id || user.id);
    setSaving(id);
    setError("");
    try {
      const updated = await api.reviewCoachApplication(
        id,
        decision,
        reasons[id]?.trim() || "",
      );
      onReviewed(updated);
    } catch (err) {
      setError(
        err.message ||
          "No se pudo revisar la solicitud. Actualiza la lista e inténtalo de nuevo.",
      );
    } finally {
      setSaving("");
    }
  };
  return (
    <section
      aria-label="Solicitudes de acceso como coach"
      className="my-5 space-y-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4"
    >
      <h2 className="text-lg font-semibold">
        Solicitudes de coach · {pending.length}
      </h2>
      {!pending.length ? (
        <p className="text-sm text-[color:var(--text-muted)]">
          No hay solicitudes pendientes.
        </p>
      ) : null}
      {pending.map((user) => {
        const id = String(user._id || user.id);
        return (
          <article
            key={id}
            className="space-y-3 border-t border-[color:var(--border)] pt-4"
          >
            <p className="font-semibold">
              {user.name} · {user.email}
            </p>
            <p className="whitespace-pre-wrap text-sm">
              <strong>Experiencia: </strong>
              {user.coachApplication.experience}
            </p>
            <p className="whitespace-pre-wrap text-sm">
              <strong>Uso previsto: </strong>
              {user.coachApplication.intendedUse}
            </p>
            <label className="block text-sm">
              Motivo del rechazo (obligatorio para rechazar)
              <textarea
                maxLength={500}
                value={reasons[id] || ""}
                onChange={(event) =>
                  setReasons((current) => ({
                    ...current,
                    [id]: event.target.value,
                  }))
                }
                className="mt-2 block w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-3"
              />
            </label>
            <p className="text-xs text-[color:var(--text-muted)]">
              Al aprobar se habilitan las herramientas de coach. Si tiene un
              coach asignado, finalizará esa vinculación y conservará sus
              entrenamientos.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={Boolean(saving) || !user.isActive}
                onClick={() => review(user, "approved")}
                className="theme-accent-solid min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
              >
                {saving === id ? "Guardando..." : "Aprobar"}
              </button>
              <button
                type="button"
                disabled={Boolean(saving) || !reasons[id]?.trim()}
                onClick={() => review(user, "rejected")}
                className="min-h-11 rounded-lg border border-[color:var(--border)] px-4 text-sm font-semibold disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </article>
        );
      })}
      {error ? (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      ) : null}
    </section>
  );
}
