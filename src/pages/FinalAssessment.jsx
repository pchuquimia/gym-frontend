import { useState } from "react";
import { ArrowLeft, Check, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "../services/api";

export default function FinalAssessment({ onBack, onNavigate }) {
  const storedPlanId =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("final_assessment_plan_id") || ""
      : "";
  const [form, setForm] = useState({
    progress: 0,
    goalReached: "",
    pain: "",
    feedback: "",
    availabilityChanged: false,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!storedPlanId || !form.progress || !form.goalReached) {
      toast.error("Completa las respuestas obligatorias");
      return;
    }
    try {
      setSaving(true);
      await api.saveFinalAssessment({ planId: storedPlanId, answers: form });
      sessionStorage.removeItem("final_assessment_plan_id");
      toast.success("Evaluación enviada a tu coach");
      onNavigate?.("dashboard");
    } catch (error) {
      toast.error(error.message || "No se pudo enviar la evaluación");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl pb-16 text-[color:var(--text)]">
      <header className="flex min-h-16 items-center border-b border-[color:var(--border)] px-2 md:px-0">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : onNavigate?.("dashboard"))}
          className="grid h-11 w-11 place-items-center rounded-full"
          aria-label="Volver"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold">
          Evaluación final
        </h1>
        <span className="w-11" />
      </header>
      <form onSubmit={submit} className="space-y-5 px-3 pt-5 md:px-0">
        <section className="rounded-[28px] bg-[#181918] p-5 text-white dark:bg-[#e2ff00] dark:text-black">
          <ClipboardCheck className="h-7 w-7" />
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
            Cerramos este bloque
          </h2>
          <p className="mt-2 text-sm opacity-70">
            Tus respuestas ayudarán a tu coach a preparar la siguiente
            programación.
          </p>
        </section>
        <fieldset className="rounded-[22px] bg-[color:var(--card)] p-4">
          <legend className="text-sm font-semibold">
            ¿Cómo calificas tu progreso?
          </legend>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, progress: score }))
                }
                className={`h-11 rounded-full text-sm font-semibold ${form.progress === score ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black" : "bg-[color:var(--surface-subtle)]"}`}
              >
                {score}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="rounded-[22px] bg-[color:var(--card)] p-4">
          <legend className="text-sm font-semibold">
            ¿Alcanzaste el objetivo de este bloque?
          </legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["yes", "Sí"],
              ["partly", "En parte"],
              ["no", "No"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, goalReached: value }))
                }
                className={`min-h-11 rounded-xl text-sm font-semibold ${form.goalReached === value ? "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black" : "bg-[color:var(--surface-subtle)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block rounded-[22px] bg-[color:var(--card)] p-4 text-sm font-semibold">
          ¿Apareció alguna molestia o dolor?
          <textarea
            rows={3}
            maxLength={500}
            value={form.pain}
            onChange={(event) =>
              setForm((current) => ({ ...current, pain: event.target.value }))
            }
            className="mt-3 w-full resize-none rounded-xl bg-[color:var(--surface-subtle)] p-3 text-sm font-normal outline-none"
          />
        </label>
        <label className="block rounded-[22px] bg-[color:var(--card)] p-4 text-sm font-semibold">
          ¿Qué funcionó bien y qué cambiarías?
          <textarea
            rows={4}
            maxLength={1000}
            value={form.feedback}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                feedback: event.target.value,
              }))
            }
            className="mt-3 w-full resize-none rounded-xl bg-[color:var(--surface-subtle)] p-3 text-sm font-normal outline-none"
          />
        </label>
        <label className="flex items-start gap-3 rounded-[22px] bg-[color:var(--card)] p-4 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.availabilityChanged}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                availabilityChanged: event.target.checked,
              }))
            }
            className="mt-0.5"
          />
          <span>
            Mi disponibilidad semanal cambió para el siguiente bloque.
          </span>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#181918] text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#e2ff00] dark:text-black"
        >
          <Check className="h-4 w-4" />
          {saving ? "Enviando..." : "Enviar evaluación"}
        </button>
      </form>
    </main>
  );
}
