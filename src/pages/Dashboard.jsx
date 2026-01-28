import { useMemo, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Flame,
  Activity,
  Clock,
  MapPin,
} from "lucide-react";
import Skeleton from "../components/ui/skeleton";
import Button from "../components/ui/button";
import { api } from "../services/api";
import { presets } from "../utils/motion";
import { useTrainingData } from "../context/TrainingContext";

const chartTheme = {
  background: "transparent",
  textColor: "var(--text-muted)",
  axis: {
    domain: { line: { stroke: "var(--border)", strokeWidth: 1 } },
    ticks: {
      line: { stroke: "var(--border)", strokeWidth: 1 },
      text: { fill: "var(--text-muted)", fontSize: 11 },
    },
    legend: { text: { fill: "var(--text-muted)", fontSize: 12 } },
  },
  grid: { line: { stroke: "var(--border)", strokeWidth: 1, opacity: 0.35 } },
  tooltip: {
    container: {
      background: "var(--card)",
      color: "var(--text)",
      fontSize: 12,
      borderRadius: 12,
      padding: 10,
      boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
      border: "1px solid var(--border)",
    },
  },
};

const rangeOptions = [
  { id: "7", label: "Semanal", days: 7 },
  { id: "30", label: "Mensual", days: 30 },
  { id: "90", label: "Trimestral", days: 90 },
];

const slugify = (text) =>
  text
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const toValidDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const normalized =
    typeof value === "string" && value.length <= 10
      ? `${value}T00:00:00`
      : value;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getDateTimestamp = (value) => {
  const d = toValidDate(value);
  return d ? d.getTime() : 0;
};

const getISODateKey = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  const d = toValidDate(value);
  if (!d) return null;
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

const titleCase = (text) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : "";

const clampText = (text = "", max = 14) => {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 3))}...`;
};

const getExerciseKey = (exercise = {}) => {
  const key =
    exercise.exerciseId ||
    exercise.id ||
    slugify(exercise.exerciseName || exercise.name || "");
  return key || null;
};

const parsePerformance = (entry = {}) => {
  const weightRaw = entry.weightKg ?? entry.weight ?? entry.kg ?? null;
  const repsRaw = entry.reps ?? null;
  const weight = Number(weightRaw ?? 0);
  const reps = Number(repsRaw ?? 0);
  if (!weight && !reps) return null;
  return { weight, reps };
};

const isBetter = (next, current) => {
  if (!next) return false;
  if (!current) return true;
  if (next.weight > current.weight) return true;
  if (next.weight < current.weight) return false;
  return next.reps > (current.reps || 0);
};

function Dashboard({ onNavigate }) {
  const { trainings } = useTrainingData();
  const [range, setRange] = useState("7");
  const [summarySupported, setSummarySupported] = useState(true);

  const go = (key) => {
    if (!key) return;
    const routeKey = key === "historial" ? "admin_sesiones" : key;
    if (onNavigate) return onNavigate(routeKey);
    const paths = {
      registrar: "/registrar-entrenamiento",
      historial: "/admin-sesiones",
      ejercicio_analitica: "/analitica-ejercicio",
      rutinas: "/rutinas",
      objetivos: "/objetivos",
    };
    const path = paths[key];
    if (path) window.location.href = path;
  };

  const summaryQuery = useQuery({
    queryKey: ["dashboardSummary", range, summarySupported],
    queryFn: async () => {
      const days = Number(range);
      const today = new Date();
      const to = today.toISOString().slice(0, 10);
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - (days - 1));
      const from = fromDate.toISOString().slice(0, 10);

      let data = null;
      if (summarySupported) {
        try {
          data = await api.getTrainingsSummary({ from, to });
        } catch (err) {
          console.warn("Resumen no disponible, usando fallback", err?.message);
          setSummarySupported(false);
        }
      }

      if (!data) {
        const list = await api.getTrainings({
          page: 1,
          limit: 200,
          fields: "date,totalVolume,routineName,branch,durationSeconds",
          from,
          to,
          meta: false,
        });

        const byWeek = new Map();
        let totalVolume = 0;

        (list || []).forEach((t) => {
          const date = t.date || t.createdAt;
          if (!date) return;
          const vol = Number(t.totalVolume || 0);
          totalVolume += vol;

          const d = new Date(`${date}T00:00:00Z`);
          const dayNum = d.getUTCDay() || 7;
          d.setUTCDate(d.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          const wk = `${d.getUTCFullYear()}-W${String(
            Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
          ).padStart(2, "0")}`;

          byWeek.set(wk, (byWeek.get(wk) || 0) + vol);
        });

        data = {
          chart: Array.from(byWeek.entries())
            .sort((a, b) => (a[0] < b[0] ? -1 : 1))
            .map(([x, y]) => ({ x, y })),
          totalVolume,
          sessionsCount: (list || []).length,
          prs: 0,
          recentSessions: (list || []).slice(0, 5),
          objectives: [],
        };
      }

      return {
        chart: Array.isArray(data.chart) ? data.chart : [],
        totalVolume: Number(data.totalVolume) || 0,
        sessionsCount: Number(data.sessionsCount) || 0,
        prs: Number(data.prs) || 0,
        recentSessions: Array.isArray(data.recentSessions)
          ? data.recentSessions
          : [],
        objectives: Array.isArray(data.objectives) ? data.objectives : [],
      };
    },
    staleTime: 60 * 1000,
  });

  const summary = summaryQuery.data || {
    chart: [],
    totalVolume: 0,
    sessionsCount: 0,
    prs: 0,
    recentSessions: [],
    objectives: [],
  };
  const loading = summaryQuery.isLoading;

  const yValues = summary.chart.map((p) => Number(p.y || 0));
  const minY = yValues.length ? Math.min(...yValues) * 0.98 : "auto";
  const maxY = yValues.length ? Math.max(...yValues) * 1.05 : "auto";

  const last = summary.recentSessions?.[0] || null;

  const avg = summary.sessionsCount
    ? Math.round(summary.totalVolume / summary.sessionsCount)
    : 0;

  const prStats = useMemo(() => {
    const days = Number(range) || 7;
    const today = new Date();
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    const prevStart = new Date(prevEnd);
    prevStart.setHours(0, 0, 0, 0);
    prevStart.setDate(prevStart.getDate() - (days - 1));

    const all = (trainings || [])
      .map((tr) => ({
        ...tr,
        _ts: getDateTimestamp(tr.date || tr.createdAt),
      }))
      .filter((tr) => tr._ts)
      .sort((a, b) => a._ts - b._ts);

    const computeForRange = (rangeStart, rangeEnd) => {
      const bestMap = new Map();
      const updateBest = (exerciseKey, perf) => {
        if (!exerciseKey || !perf) return false;
        const current = bestMap.get(exerciseKey);
        if (isBetter(perf, current)) {
          bestMap.set(exerciseKey, perf);
          return true;
        }
        return false;
      };

      all.forEach((tr) => {
        const d = toValidDate(tr.date || tr.createdAt);
        if (!d || d >= rangeStart) return;
        (tr.exercises || []).forEach((ex) => {
          const key = getExerciseKey(ex);
          (ex.sets || []).forEach((set) => {
            const entries =
              Array.isArray(set.entries) && set.entries.length
                ? set.entries
                : [set];
            entries.forEach((entry) => {
              const perf = parsePerformance(entry);
              updateBest(key, perf);
            });
          });
        });
      });

      let count = 0;
      all.forEach((tr) => {
        const d = toValidDate(tr.date || tr.createdAt);
        if (!d || d < rangeStart || d > rangeEnd) return;
        (tr.exercises || []).forEach((ex) => {
          const key = getExerciseKey(ex);
          (ex.sets || []).forEach((set) => {
            const entries =
              Array.isArray(set.entries) && set.entries.length
                ? set.entries
                : [set];
            entries.forEach((entry) => {
              const perf = parsePerformance(entry);
              if (updateBest(key, perf)) count += 1;
            });
          });
        });
      });

      return count;
    };

    const current = computeForRange(start, end);
    const previous = computeForRange(prevStart, prevEnd);
    return {
      current,
      previous,
      diff: current - previous,
    };
  }, [trainings, range]);

  const weekSummary = useMemo(() => {
    const byDate = new Map();
    (trainings || []).forEach((tr) => {
      const key = getISODateKey(tr.date || tr.createdAt);
      if (!key) return;
      const routineName = tr.routineName || tr.routineId || "";
      const ts = getDateTimestamp(tr.date || tr.createdAt);
      const current = byDate.get(key) || { routine: "", ts: 0 };
      if (routineName && ts >= current.ts) {
        current.routine = routineName;
        current.ts = ts;
      }
      byDate.set(key, current);
    });

    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = getISODateKey(d);
      const label = titleCase(
        d
          .toLocaleDateString("es-ES", { weekday: "short" })
          .replace(".", "")
      );
      const shortLabel = label ? label.slice(0, 1) : "";
      const info = byDate.get(key) || { routine: "" };
      days.push({
        key,
        label,
        shortLabel,
        routine: info.routine || "",
        routineShort: clampText(info.routine || "Libre", 12),
        isToday: i === 0,
      });
    }
    return { days };
  }, [trainings]);

  const weekInsights = useMemo(() => {
    const routineCounts = new Map();
    const branchCounts = new Map();
    const daySet = new Set();
    let totalSessions = 0;
    let totalMinutes = 0;
    let totalVolume = 0;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    cutoff.setHours(0, 0, 0, 0);

    (trainings || []).forEach((tr) => {
      const dateValue = tr.date || tr.createdAt;
      const d = toValidDate(dateValue);
      if (!d || d < cutoff) return;
      totalSessions += 1;
      totalMinutes += Math.round((tr.durationSeconds || 0) / 60);
      totalVolume += Number(tr.totalVolume || 0);
      const routineName = tr.routineName || tr.routineId || "Sin rutina";
      routineCounts.set(routineName, (routineCounts.get(routineName) || 0) + 1);
      const branchName = tr.branch || "General";
      branchCounts.set(branchName, (branchCounts.get(branchName) || 0) + 1);
      const dayKey = getISODateKey(dateValue);
      if (dayKey) daySet.add(dayKey);
    });

    const topRoutineEntry = Array.from(routineCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return {
      totalSessions,
      totalMinutes,
      totalVolume,
      avgMinutes: totalSessions ? Math.round(totalMinutes / totalSessions) : 0,
      trainedDays: daySet.size,
      topRoutine: topRoutineEntry ? topRoutineEntry[0] : "Sin rutina",
      topRoutineCount: topRoutineEntry ? topRoutineEntry[1] : 0,
      branches: Array.from(branchCounts.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [trainings]);

  return (
    <motion.div
      variants={presets.page}
      initial="hidden"
      animate="show"
      exit="exit"
      className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl px-3 sm:px-4 md:px-6 pb-10 space-y-4 lg:space-y-6"
    >
      <section className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-6 shadow-sm">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        </div>

        <div className="relative z-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--text-muted)] font-semibold">
              Dashboard
            </p>
            <h1 className="text-3xl sm:text-4xl font-display font-semibold text-[color:var(--text)]">
              Tu progreso
            </h1>
            <p className="text-sm text-[color:var(--text-muted)] max-w-md">
              Lo esencial de tu entrenamiento en un vistazo. Mantente al dia con
              tu ritmo y tus objetivos.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="w-full sm:w-auto" onClick={() => go("registrar")}>
                Registrar entrenamiento
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => go("rutinas")}
              >
                Ver rutinas
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-3 shadow-sm dark:border-emerald-400/30 dark:bg-emerald-500/10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                  Volumen
                </p>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-6 w-20" />
              ) : (
                <p className="mt-2 text-lg font-semibold text-[color:var(--text)]">
                  {summary.totalVolume.toLocaleString()} kg
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-blue-200/70 bg-blue-50/60 p-3 shadow-sm dark:border-blue-400/30 dark:bg-blue-500/10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                  Sesiones
                </p>
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-6 w-12" />
              ) : (
                <p className="mt-2 text-lg font-semibold text-[color:var(--text)]">
                  {summary.sessionsCount}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-violet-200/70 bg-violet-50/60 p-3 shadow-sm dark:border-violet-400/30 dark:bg-violet-500/10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                  Promedio
                </p>
                <TrendingUp className="h-4 w-4 text-violet-600" />
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-6 w-16" />
              ) : (
                <p className="mt-2 text-lg font-semibold text-[color:var(--text)]">
                  {avg.toLocaleString()} kg
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-3 shadow-sm dark:border-amber-400/30 dark:bg-amber-500/10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                  Nuevas marcas
                </p>
                <Flame className="h-4 w-4 text-amber-500" />
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-6 w-10" />
              ) : (
                <p className="mt-2 text-lg font-semibold text-[color:var(--text)]">
                  {prStats.current}
                </p>
              )}
              <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">
                {prStats.diff >= 0 ? "+" : ""}
                {prStats.diff} vs periodo anterior
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
        <div className="space-y-4">
          <motion.section className="card" variants={presets.card}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[color:var(--text)]">
                  Semana activa
                </h3>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Rutina realizada por dia
                </p>
              </div>
              <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-1 text-[10px] font-semibold text-[color:var(--text-muted)]">
                7 dias
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 sm:grid-cols-7 gap-2">
              {weekSummary.days.map((day) => (
                <div
                  key={day.key}
                  className={`rounded-xl border px-1.5 py-2 sm:px-2 text-center ${
                    day.isToday
                      ? "border-emerald-400/60 bg-emerald-500/10"
                      : "border-[color:var(--border)] bg-[color:var(--card)]"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                    <span className="sm:hidden">{day.shortLabel}</span>
                    <span className="hidden sm:inline">{day.label}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-center text-xs font-semibold text-[color:var(--text)]">
                    <span className="max-w-[80px] truncate text-center">
                      {day.routineShort}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section className="card" variants={presets.card}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-[color:var(--text)]">
                  Tendencia de carga
                </h3>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Volumen total por periodo
                </p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] p-1">
                {rangeOptions.map((opt) => {
                  const active = range === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={[
                        "h-8 px-3 rounded-full text-xs font-semibold transition",
                        active
                          ? "bg-[color:var(--bg)] text-[color:var(--text)] shadow-sm"
                          : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]",
                      ].join(" ")}
                      onClick={() => setRange(opt.id)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 h-52 md:h-64 lg:h-72 w-full">
              {summary.chart.length ? (
                <ResponsiveLine
                  data={[{ id: "Volumen", data: summary.chart }]}
                  theme={chartTheme}
                  margin={{ top: 10, right: 12, bottom: 32, left: 40 }}
                  xScale={{ type: "point" }}
                  yScale={{ type: "linear", min: minY, max: maxY, stacked: false }}
                  axisBottom={{
                    tickSize: 0,
                    tickPadding: 10,
                    format: (v) => (v || "").replace(/\d{4}-W/, "W"),
                  }}
                  axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    tickFormat: (v) => `${v}`,
                  }}
                  curve="monotoneX"
                  enablePoints={false}
                  enableArea
                  areaOpacity={0.18}
                  colors={["#10b981"]}
                  useMesh
                  enableGridX={false}
                  gridYValues={4}
                  areaBaselineValue={minY === "auto" ? 0 : minY}
                  defs={[
                    {
                      id: "volArea",
                      type: "linearGradient",
                      colors: [
                        { offset: 0, color: "#10b981", opacity: 0.35 },
                        { offset: 100, color: "#10b981", opacity: 0.05 },
                      ],
                    },
                  ]}
                  fill={[{ match: "*", id: "volArea" }]}
                  tooltip={({ point }) => (
                    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 shadow-md text-xs">
                      <p className="text-[color:var(--text-muted)] mb-1">
                        {point.data.xFormatted}
                      </p>
                      <p className="text-sm font-semibold text-[color:var(--text)]">
                        {Number(point.data.y).toLocaleString()} kg reps
                      </p>
                    </div>
                  )}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-[color:var(--text-muted)]">
                  {loading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    "Sin datos suficientes"
                  )}
                </div>
              )}
            </div>
          </motion.section>

          <motion.section className="card" variants={presets.card}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[color:var(--text)]">
                Ultima sesion
              </h3>
              <span className="text-xs font-medium text-[color:var(--text-muted)]">
                {last?.date
                  ? new Date(`${last.date}T00:00:00`).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "--"}
              </span>
            </div>

            {last ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-3">
                  <p className="text-base font-semibold text-[color:var(--text)]">
                    {last.routineName || "Sin rutina"}
                  </p>
                  <p className="text-xs text-[color:var(--text-muted)] mt-1">
                    Volumen:{" "}
                    <span className="font-semibold text-[color:var(--text)]">
                      {last.totalVolume?.toLocaleString?.() || 0} kg reps
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-[color:var(--text-muted)]">
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {Math.round((last.durationSeconds || 0) / 60)} min
                  </div>
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {last.branch || "N/A"}
                  </div>
                </div>

                <button
                  type="button"
                  className="text-sm font-semibold text-blue-600 inline-flex items-center gap-1"
                  onClick={() => go("historial")}
                >
                  Ver historial &gt;
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                Aun no registras entrenamientos.
              </p>
            )}
          </motion.section>
        </div>

        <div className="space-y-4">
          <motion.section className="card" variants={presets.card}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[color:var(--text)]">
                  Ritmo semanal
                </h3>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Indicadores clave de los ultimos 7 dias
                </p>
              </div>
              <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-200 grid place-items-center dark:bg-emerald-500/10 dark:border-emerald-400/30">
                <Activity className="h-4 w-4 text-emerald-600" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[color:var(--text-muted)]">
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold">
                  Dias activos
                </p>
                <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                  {weekInsights.trainedDays}/7
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold">
                  Sesiones
                </p>
                <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                  {weekInsights.totalSessions}
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold">
                  Tiempo total
                </p>
                <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                  {weekInsights.totalMinutes} min
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold">
                  Promedio
                </p>
                <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                  {weekInsights.avgMinutes} min
                </p>
              </div>
            </div>
          </motion.section>

          <motion.section className="card" variants={presets.card}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[color:var(--text)]">
                  Rutina foco
                </h3>
                <p className="text-xs text-[color:var(--text-muted)]">
                  La rutina mas repetida de la semana
                </p>
              </div>
              <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-1 text-[10px] font-semibold text-[color:var(--text-muted)]">
                {weekInsights.topRoutineCount}x
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-3">
              <p className="text-base font-semibold text-[color:var(--text)]">
                {weekInsights.topRoutine}
              </p>
              <p className="text-xs text-[color:var(--text-muted)] mt-1">
                Volumen semanal:{" "}
                <span className="font-semibold text-[color:var(--text)]">
                  {weekInsights.totalVolume.toLocaleString()} kg reps
                </span>
              </p>
            </div>

            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] font-semibold">
                Sedes activas
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekInsights.branches.length ? (
                  weekInsights.branches.map(([branch, count]) => (
                    <span
                      key={branch}
                      className="rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1 text-[11px] font-semibold text-[color:var(--text-muted)]"
                    >
                      {branch} · {count}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[color:var(--text-muted)]">
                    Sin registros
                  </span>
                )}
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}

export default Dashboard;



