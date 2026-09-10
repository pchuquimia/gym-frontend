import { useEffect, useState } from "react";
import { ArrowLeft, Ruler, Save } from "lucide-react";
import { toast } from "sonner";
import OperationLoader from "../components/system/OperationLoader";
import { api } from "../services/api";

const FIELDS = [
  ["waist", "Cintura"],
  ["chest", "Pecho"],
  ["hips", "Cadera"],
  ["arm", "Brazo"],
  ["thigh", "Muslo"],
  ["calf", "Pantorrilla"],
];

const localDateKey = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

export default function AthleteMeasurements({
  onBack,
  onNavigate,
  coachAthlete,
}) {
  const athleteId = coachAthlete?.id || "";
  const requestedFields = (() => {
    if (athleteId || typeof sessionStorage === "undefined") return FIELDS;
    try {
      const values = JSON.parse(
        sessionStorage.getItem("measurement_mission_fields") || "[]",
      );
      const selected = FIELDS.filter(([key]) => values.includes(key));
      return selected.length ? selected : FIELDS;
    } catch {
      return FIELDS;
    }
  })();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    dateKey: localDateKey(),
    values: Object.fromEntries(FIELDS.map(([key]) => [key, ""])),
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api
      .getMeasurements(athleteId)
      .then((data) => setItems(data.measurements || []))
      .catch((error) =>
        toast.error(error.message || "No se pudieron cargar las medidas"),
      )
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    try {
      setSaving(true);
      await api.saveMeasurements({
        ...form,
        athleteId: athleteId || undefined,
      });
      toast.success("Medidas registradas");
      await load();
    } catch (error) {
      toast.error(error.message || "No se pudieron guardar las medidas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl pb-16 text-[color:var(--text)]">
      <header className="flex min-h-16 items-center border-b border-[color:var(--border)] px-2 md:px-0">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : onNavigate?.("dashboard"))}
          className="grid h-11 w-11 place-items-center rounded-full"
          aria-label="Volver"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-center font-sans text-lg font-semibold">
          Medidas corporales
        </h1>
        <span className="w-11" />
      </header>
      <div className="px-3 pt-5 md:px-0">
        <section className="rounded-[28px] bg-[#181918] p-5 text-white dark:bg-[#e2ff00] dark:text-black">
          <Ruler className="h-7 w-7" />
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
            Registro periódico
          </h2>
          <p className="mt-2 text-sm opacity-70">
            Mide siempre en condiciones similares y sin ajustar demasiado la
            cinta.
          </p>
        </section>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block rounded-[20px] bg-[color:var(--card)] p-4 text-xs font-medium text-[color:var(--text-muted)]">
            Fecha
            <input
              type="date"
              value={form.dateKey}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  dateKey: event.target.value,
                }))
              }
              className="mt-2 h-11 w-full bg-transparent text-base font-semibold text-[color:var(--text)] outline-none"
            />
          </label>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {requestedFields.map(([key, label]) => (
              <label
                key={key}
                className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-xs font-medium text-[color:var(--text-muted)]"
              >
                {label}
                <span className="mt-2 flex items-end gap-2">
                  <input
                    type="number"
                    min="1"
                    max="400"
                    step="0.1"
                    inputMode="decimal"
                    value={form.values[key]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        values: {
                          ...current.values,
                          [key]: event.target.value,
                        },
                      }))
                    }
                    className="h-10 min-w-0 flex-1 border-b border-[color:var(--border)] bg-transparent text-xl font-semibold text-[color:var(--text)] outline-none"
                  />
                  <small>cm</small>
                </span>
              </label>
            ))}
          </section>
          <label className="block rounded-[20px] bg-[color:var(--card)] p-4 text-xs font-medium text-[color:var(--text-muted)]">
            Notas
            <textarea
              rows={3}
              maxLength={500}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              className="mt-2 w-full resize-none bg-transparent text-sm text-[color:var(--text)] outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#181918] text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#e2ff00] dark:text-black"
          >
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar medidas"}
          </button>
        </form>
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Historial</h2>
          {loading ? (
            <OperationLoader
              active
              delayMs={0}
              mode="inline"
              title="Cargando medidas"
            />
          ) : items.length ? (
            <div className="mt-3 divide-y divide-[color:var(--detail-row-divider)] overflow-hidden rounded-[24px] bg-[color:var(--card)]">
              {items.map((item) => (
                <article key={item._id} className="p-4">
                  <strong className="text-sm">
                    {new Date(`${item.dateKey}T12:00:00`).toLocaleDateString(
                      "es-BO",
                      { day: "numeric", month: "long", year: "numeric" },
                    )}
                  </strong>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {FIELDS.filter(([key]) => item.values?.[key]).map(
                      ([key, label]) => (
                        <span
                          key={key}
                          className="rounded-full bg-[color:var(--surface-subtle)] px-3 py-1.5 text-xs"
                        >
                          {label} · {item.values[key]} cm
                        </span>
                      ),
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-[20px] bg-[color:var(--card)] p-5 text-sm text-[color:var(--text-muted)]">
              Todavía no hay mediciones registradas.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
