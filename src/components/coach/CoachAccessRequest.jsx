import { useState } from "react";
import { api } from "../../services/api";
import { toast } from "../../utils/toast";

export default function CoachAccessRequest({ user, onSubmitted }) {
  const [open, setOpen] = useState(false);
  const [experience, setExperience] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState("");
  const status =
    submission && submission.previousApplication === user.coachApplication
      ? "pending"
      : user.coachApplication?.status || "none";
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await api.requestCoachAccess({
        experience: experience.trim(),
        intendedUse: intendedUse.trim(),
      });
      setSubmission({ previousApplication: user.coachApplication });
      setOpen(false);
      toast.success("Solicitud enviada");
      await onSubmitted?.();
    } catch (err) {
      setError(
        err.message || "No se pudo enviar la solicitud. Inténtalo de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (user.role !== "Cliente" || user.isDemo) return null;
  return (
    <div className="space-y-3 p-5">
      <p className="text-sm text-[color:var(--text-muted)]">
        Durante la beta, el administrador revisa las solicitudes para gestionar
        alumnos. Puedes seguir entrenando con tu cuenta.
      </p>
      {status === "pending" ? (
        <p role="status" className="text-sm font-semibold">
          Solicitud en revisión
        </p>
      ) : null}
      {status === "rejected" ? (
        <div role="status" className="text-sm">
          <p className="font-semibold">Solicitud no aprobada</p>
          <p className="mt-1 whitespace-pre-wrap">
            {user.coachApplication.reason}
          </p>
        </div>
      ) : null}
      {!["pending", "approved"].includes(status) && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="theme-accent-solid min-h-11 rounded-lg px-4 text-sm font-semibold"
        >
          {status === "rejected"
            ? "Enviar nueva solicitud"
            : "Solicitar acceso como coach"}
        </button>
      ) : null}
      {open ? (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-semibold">
            Tu experiencia como coach
            <textarea
              required
              minLength={10}
              maxLength={1500}
              value={experience}
              onChange={(event) => setExperience(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-base font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            ¿Cómo piensas usar Rirfit con tus alumnos?
            <textarea
              required
              minLength={10}
              maxLength={1500}
              value={intendedUse}
              onChange={(event) => setIntendedUse(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-base font-normal"
            />
          </label>
          <p className="text-xs text-[color:var(--text-muted)]">
            Entre 10 y 1500 caracteres por respuesta.
          </p>
          <div className="flex gap-3">
            <button
              disabled={
                saving ||
                experience.trim().length < 10 ||
                intendedUse.trim().length < 10
              }
              className="theme-accent-solid min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Enviando..." : "Enviar solicitud"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setOpen(false)}
              className="px-3 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}
