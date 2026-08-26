import { useEffect, useMemo, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Loader2,
  Minus,
  Pencil,
  Weight,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "../components/library/ConfirmModal";
import Button from "../components/ui/button";
import { useThemeMode } from "../hooks/useThemeMode";
import { api } from "../services/api";
import { nivoTheme } from "../utils/nivoTheme";

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_OPTIONS = [30, 90, 365];

function getLocalDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function shiftLocalDate(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return getLocalDateKey(new Date(year, month - 1, day + days));
}

function formatDate(dateKey, options = {}) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  if (!year || !month || !day) return "--";
  return new Date(year, month - 1, day).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    ...options,
  });
}

function moveCursorToEnd(event) {
  const input = event.currentTarget;
  window.requestAnimationFrame(() => {
    const end = input.value.length;
    input.setSelectionRange?.(end, end);
  });
}

function WeightTracking({ coachAthlete = null }) {
  const queryClient = useQueryClient();
  const { theme } = useThemeMode();
  const athleteId = coachAthlete?.id || coachAthlete?._id || "";
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const [rangeDays, setRangeDays] = useState(90);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fromDate = useMemo(
    () => shiftLocalDate(todayKey, -(rangeDays - 1)),
    [rangeDays, todayKey],
  );
  const queryKey = ["weigh-ins", athleteId || "self", rangeDays, todayKey];
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      api.getWeighIns({
        athleteId,
        from: fromDate,
        to: todayKey,
        today: todayKey,
      }),
    staleTime: 30 * 1000,
  });

  const entries = useMemo(
    () => (Array.isArray(data?.entries) ? data.entries : []),
    [data?.entries],
  );
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.dateKey === selectedDate) || null,
    [entries, selectedDate],
  );
  const summary = data?.summary || {};

  useEffect(() => {
    setWeight(selectedEntry ? String(selectedEntry.weightKg) : "");
    setNote(selectedEntry?.note || "");
  }, [selectedDate, selectedEntry]);

  const chartData = useMemo(
    () => [
      {
        id: "Peso",
        data: entries.map((entry) => ({
          x: entry.dateKey,
          y: entry.weightKg,
        })),
      },
    ],
    [entries],
  );
  const tickValues = useMemo(() => {
    if (entries.length <= 6) return entries.map((entry) => entry.dateKey);
    const step = Math.ceil(entries.length / 6);
    return entries
      .filter((_, index) => index % step === 0 || index === entries.length - 1)
      .map((entry) => entry.dateKey);
  }, [entries]);

  const numericWeight = Number(String(weight).replace(",", "."));
  const validWeight =
    Number.isFinite(numericWeight) &&
    numericWeight >= 25 &&
    numericWeight <= 400;

  const handleSave = async (event) => {
    event.preventDefault();
    if (!validWeight || saving) return;
    setSaving(true);
    try {
      await api.saveWeighIn({
        ownerId: athleteId || undefined,
        dateKey: selectedDate,
        weightKg: numericWeight,
        note,
      });
      await queryClient.invalidateQueries({ queryKey: ["weigh-ins"] });
      toast.success(selectedEntry ? "Pesaje actualizado" : "Pesaje registrado");
    } catch (requestError) {
      toast.error(requestError.message || "No se pudo guardar el pesaje");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.deleteWeighIn(target._id || target.id);
      if (target.dateKey === selectedDate) {
        setWeight("");
        setNote("");
      }
      await queryClient.invalidateQueries({ queryKey: ["weigh-ins"] });
      toast.success("Pesaje eliminado");
    } catch (requestError) {
      toast.error(requestError.message || "No se pudo eliminar el pesaje");
    }
  };

  const change = Number(summary.changeKg);
  const ChangeIcon =
    change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;

  return (
    <div className="dashboard-shell mx-auto w-full max-w-md space-y-5 pb-12 text-[color:var(--text)] md:max-w-5xl xl:max-w-6xl">
      <header className="border-b border-[color:var(--border)] pb-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#ff5722] dark:text-[#e2ff00]">
            Seguimiento corporal
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase leading-none sm:text-3xl">
            Pesajes
          </h1>
        </div>
      </header>

      {coachAthlete ? (
        <div className="border-l-4 border-[color:var(--accent)] bg-[color:var(--accent)] px-3 py-2 text-[color:var(--accent-contrast)]">
          <p className="text-[10px] font-black uppercase text-current">
            Atleta seleccionado
          </p>
          <p className="mt-0.5 text-sm font-black">{coachAthlete.name}</p>
        </div>
      ) : null}

      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <article className="border border-[color:var(--border)] bg-[color:var(--card)] p-3 sm:p-4">
          <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
            Actual
          </p>
          <p className="mt-2 text-2xl font-black leading-none sm:text-3xl">
            {summary.latest ? summary.latest.weightKg : "--"}
            <span className="ml-1 text-xs text-[color:var(--text-muted)]">
              kg
            </span>
          </p>
        </article>
        <article className="border border-[color:var(--border)] bg-[color:var(--card)] p-3 sm:p-4">
          <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
            Cambio
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            {summary.changeKg != null ? (
              <ChangeIcon className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
            ) : null}
            <p className="text-2xl font-black leading-none sm:text-3xl">
              {summary.changeKg == null
                ? "--"
                : `${change > 0 ? "+" : ""}${change}`}
              <span className="ml-1 text-xs text-[color:var(--text-muted)]">
                kg
              </span>
            </p>
          </div>
        </article>
        <article className="border border-[color:var(--border)] bg-[color:var(--card)] p-3 sm:p-4">
          <p className="text-[9px] font-black uppercase text-[color:var(--text-muted)]">
            Racha
          </p>
          <p className="mt-2 text-2xl font-black leading-none sm:text-3xl">
            {summary.streak || 0}
            <span className="ml-1 text-xs text-[color:var(--text-muted)]">
              dias
            </span>
          </p>
        </article>
      </section>

      <section className="border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center border ${
              summary.completedToday
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-[#ff5722] text-[#ff5722] dark:border-[#e2ff00] dark:text-[#e2ff00]"
            }`}
          >
            {summary.completedToday ? (
              <Check className="h-5 w-5 stroke-[3]" />
            ) : (
              <Weight className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-black uppercase leading-tight">
              {summary.completedToday
                ? "Pesaje diario completo"
                : "Registra tu peso de hoy"}
            </h2>
            <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
              Usa condiciones similares cada dia, idealmente al despertar.
            </p>
          </div>
        </div>

        <form
          className="mt-5 grid gap-4 sm:grid-cols-[160px_1fr]"
          onSubmit={handleSave}
        >
          <label className="block">
            <span className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Fecha
            </span>
            <input
              type="date"
              value={selectedDate}
              min={fromDate}
              max={todayKey}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-1.5 h-12 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-base font-bold outline-none focus:border-[#ff5722] dark:focus:border-[#e2ff00]"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Peso corporal
            </span>
            <span className="relative mt-1.5 block">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={weight}
                onFocus={moveCursorToEnd}
                onChange={(event) =>
                  setWeight(event.target.value.replace(/[^0-9.,]/g, ""))
                }
                placeholder="Ej. 78,5"
                className="h-12 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 pr-12 text-xl font-black outline-none focus:border-[#ff5722] dark:focus:border-[#e2ff00]"
                aria-describedby="weight-unit"
              />
              <span
                id="weight-unit"
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-black text-[color:var(--text-muted)]"
              >
                KG
              </span>
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Nota opcional
            </span>
            <input
              type="text"
              maxLength={160}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ej. En ayunas, despues de dormir 8 horas"
              className="mt-1.5 h-12 w-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-semibold outline-none focus:border-[#ff5722] dark:focus:border-[#e2ff00]"
            />
          </label>
          <Button
            type="submit"
            disabled={!validWeight || saving || !selectedDate}
            className="h-12 gap-2 sm:col-span-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Weight className="h-4 w-4" />
            )}
            {saving
              ? "Guardando"
              : selectedEntry
                ? "Actualizar pesaje"
                : "Guardar pesaje"}
          </Button>
        </form>
      </section>

      <section className="border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Evolucion
            </p>
            <h2 className="mt-1 text-xl font-black uppercase">
              Tendencia de peso
            </h2>
          </div>
          <div className="grid grid-cols-3 border border-[color:var(--border)] p-0.5">
            {RANGE_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={`h-8 min-w-12 px-2 text-[10px] font-black uppercase ${
                  rangeDays === days
                    ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
                    : "text-[color:var(--text-muted)]"
                }`}
              >
                {days === 365 ? "1 ano" : `${days} d`}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 h-72 sm:h-80">
          {isLoading ? (
            <div className="grid h-full place-items-center" role="status">
              <Loader2 className="h-7 w-7 animate-spin text-[#ff5722] dark:text-[#e2ff00]" />
            </div>
          ) : error ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p className="text-sm font-black">
                  No se pudo cargar la tendencia
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => refetch()}
                >
                  Reintentar
                </Button>
              </div>
            </div>
          ) : entries.length >= 2 ? (
            <ResponsiveLine
              data={chartData}
              theme={nivoTheme(theme)}
              margin={{ top: 18, right: 18, bottom: 44, left: 48 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: "auto", max: "auto" }}
              axisBottom={{
                tickValues,
                tickPadding: 10,
                format: (value) => formatDate(value),
              }}
              axisLeft={{
                tickPadding: 7,
                legend: "kg",
                legendOffset: -38,
                legendPosition: "middle",
              }}
              colors={[theme === "dark" ? "#e2ff00" : "#ff5722"]}
              curve="monotoneX"
              lineWidth={3}
              pointSize={7}
              pointBorderWidth={2}
              pointColor={{ from: "color" }}
              pointBorderColor={{ from: "serieColor" }}
              enableGridX={false}
              useMesh
              tooltip={({ point }) => (
                <div className="border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-lg">
                  <p className="font-black">{point.data.yFormatted} kg</p>
                  <p className="text-[color:var(--text-muted)]">
                    {formatDate(point.data.x, { year: "numeric" })}
                  </p>
                </div>
              )}
            />
          ) : (
            <div className="grid h-full place-items-center border border-dashed border-[color:var(--border)] text-center">
              <div className="max-w-xs px-4">
                <Weight className="mx-auto h-7 w-7 text-[#ff5722] dark:text-[#e2ff00]" />
                <p className="mt-3 text-sm font-black">
                  {entries.length
                    ? `${entries[0].weightKg} kg registrados`
                    : "Aun no hay pesajes"}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  La tendencia aparecera al registrar al menos dos dias.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between border-b border-[color:var(--border)] pb-3">
          <div>
            <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              Registro
            </p>
            <h2 className="mt-1 text-xl font-black uppercase">
              Historial reciente
            </h2>
          </div>
          <span className="text-xs font-black text-[color:var(--text-muted)]">
            {summary.total || 0} total
          </span>
        </div>
        <div className="divide-y divide-[color:var(--border)]">
          {[...entries]
            .reverse()
            .slice(0, 14)
            .map((entry) => (
              <article
                key={entry._id || entry.id}
                className="flex min-h-16 items-center gap-3 py-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center border border-[color:var(--border)] bg-[color:var(--card)]">
                  <CalendarDays className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-black">{entry.weightKg} kg</p>
                  <p className="truncate text-xs font-semibold text-[color:var(--text-muted)]">
                    {formatDate(entry.dateKey, { year: "numeric" })}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(entry.dateKey);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="grid h-10 w-10 place-items-center text-[color:var(--text-muted)] hover:text-[#ff5722] dark:hover:text-[#e2ff00]"
                  aria-label={`Editar pesaje del ${formatDate(entry.dateKey)}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(entry)}
                  className="grid h-10 w-10 place-items-center text-[color:var(--text-muted)] hover:text-red-600"
                  aria-label={`Eliminar pesaje del ${formatDate(entry.dateKey)}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </article>
            ))}
          {!isLoading && !entries.length ? (
            <p className="py-8 text-center text-sm font-semibold text-[color:var(--text-muted)]">
              Tus pesajes apareceran aqui.
            </p>
          ) : null}
        </div>
      </section>

      {deleteTarget ? (
        <ConfirmModal
          name={`${formatDate(deleteTarget.dateKey)} · ${deleteTarget.weightKg} kg`}
          entityLabel="pesaje"
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}

export default WeightTracking;
