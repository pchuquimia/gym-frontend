import { useMemo, useState } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Flame, Activity } from "lucide-react";
import Skeleton from "../components/ui/skeleton";
import Button from "../components/ui/button";
import { api } from "../services/api";
import { presets } from "../utils/motion";
import { useTrainingData } from "../context/TrainingContext";

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
  const range = "7";
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
            Math.ceil(((d - yearStart) / 86400000 + 1) / 7),
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
        d.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", ""),
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

  const monthActivity = useMemo(() => {
    const byDate = new Map();
    (trainings || []).forEach((tr) => {
      const key = getISODateKey(tr.date || tr.createdAt);
      if (!key) return;
      const current = byDate.get(key) || {
        sessions: 0,
        routines: new Set(),
        exercises: new Set(),
        volume: 0,
        minutes: 0,
      };
      current.sessions += 1;
      current.volume += Number(tr.totalVolume || 0);
      current.minutes += Math.round((tr.durationSeconds || 0) / 60);
      const routineName = tr.routineName || tr.routineId;
      if (routineName) current.routines.add(routineName);
      (tr.exercises || []).forEach((ex) => {
        const name = ex.exerciseName || ex.name;
        if (name && current.exercises.size < 4) current.exercises.add(name);
      });
      byDate.set(key, current);
    });

    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = getISODateKey(d);
      const info = byDate.get(key);
      const routines = info ? Array.from(info.routines) : [];
      const exercises = info ? Array.from(info.exercises) : [];
      const primary = routines[0] || exercises.slice(0, 2).join(", ");
      const weekday = titleCase(
        d.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", ""),
      );
      days.push({
        key,
        weekday,
        label: d.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
        }),
        trained: Boolean(info),
        sessions: info?.sessions || 0,
        volume: info?.volume || 0,
        routineShort: clampText(primary || "Descanso", 16),
        detail: routines.length
          ? routines.join(", ")
          : exercises.length
            ? exercises.join(", ")
            : "Sin entrenamiento",
        minutes: info?.minutes || 0,
        isToday: i === 0,
      });
    }
    return {
      days,
      trainedDays: days.filter((day) => day.trained).length,
      chart: days.map((day) => ({
        day: day.label.replace(".", ""),
        sesiones: day.sessions,
        entreno: day.trained ? 1 : 0,
        volume: day.volume,
        detail: day.detail,
        minutes: day.minutes,
      })),
    };
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
      (a, b) => b[1] - a[1],
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

  const threeMonthSummary = useMemo(() => {
    const monthMap = new Map();
    const today = new Date();
    for (let i = 2; i >= 0; i -= 1) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${monthDate.getFullYear()}-${String(
        monthDate.getMonth() + 1,
      ).padStart(2, "0")}`;
      const daysInMonth = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
      ).getDate();
      const label = titleCase(
        monthDate.toLocaleDateString("es-ES", { month: "long" }),
      );
      monthMap.set(key, {
        month: label,
        monthKey: key,
        entrenamientos: 0,
        diasEntrenados: new Set(),
        diasMes: daysInMonth,
        sesiones: 0,
      });
    }

    (trainings || []).forEach((tr) => {
      const key = getISODateKey(tr.date || tr.createdAt);
      if (!key) return;
      const monthKey = key.slice(0, 7);
      const item = monthMap.get(monthKey);
      if (!item) return;
      item.sesiones += 1;
      item.diasEntrenados.add(key);
    });

    return Array.from(monthMap.values()).map((item) => ({
      month: item.month,
      entrenamientos: item.diasEntrenados.size,
      sesiones: item.sesiones,
      diasMes: item.diasMes,
      ratio: `${item.diasEntrenados.size}/${item.diasMes}`,
    }));
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

        <div className="relative z-10">
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
              <Button
                className="w-full sm:w-auto"
                onClick={() => go("registrar")}
              >
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
        </div>
      </section>

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

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-6 gap-3 text-xs text-[color:var(--text-muted)]">
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold">
                Dias activos
              </p>
              <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                {weekInsights.trainedDays}/7
              </p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold">
                  Sesiones
                </p>
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                {weekInsights.totalSessions}
              </p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold">
                  Marcas
                </p>
                <Flame className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                {prStats.current}
              </p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold">
                Vs anterior
              </p>
              <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                {prStats.diff >= 0 ? "+" : ""}
                {prStats.diff}
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
                Actividad de 30 dias
              </h3>
              <p className="text-xs text-[color:var(--text-muted)]">
                Dias entrenados, descanso y rutina realizada
              </p>
            </div>
            <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-1 text-[10px] font-semibold text-[color:var(--text-muted)]">
              {monthActivity.trainedDays}/30 dias
            </div>
          </div>
          <div className="mt-5 h-56 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
            <ResponsiveBar
              data={monthActivity.chart}
              keys={["entreno"]}
              indexBy="day"
              margin={{ top: 10, right: 8, bottom: 42, left: 28 }}
              padding={0.22}
              valueScale={{ type: "linear" }}
              indexScale={{ type: "band", round: true }}
              colors={({ data }) =>
                data.entreno ? "#10b981" : "rgba(148,163,184,0.45)"
              }
              borderRadius={4}
              enableLabel={false}
              enableGridY={false}
              axisLeft={null}
              axisBottom={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: -45,
                tickValues: monthActivity.chart
                  .filter((_, idx) => idx % 3 === 0 || idx === 29)
                  .map((item) => item.day),
              }}
              theme={{
                textColor: "var(--text-muted)",
                axis: {
                  ticks: {
                    text: { fill: "var(--text-muted)", fontSize: 10 },
                  },
                },
                tooltip: {
                  container: {
                    background: "var(--card)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
                  },
                },
              }}
              tooltip={({ data }) => (
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-md">
                  <p className="font-semibold text-[color:var(--text)]">
                    {data.day}
                  </p>
                  <p className="text-[color:var(--text-muted)]">
                    {data.entreno ? data.detail : "Descanso"}
                  </p>
                  {data.entreno ? (
                    <p className="mt-1 text-[color:var(--text-muted)]">
                      {data.sesiones} ses. · {data.minutes} min
                    </p>
                  ) : null}
                </div>
              )}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-2">
            {monthActivity.days.map((day) => (
              <div
                key={day.key}
                title={`${day.label}: ${day.detail}`}
                className={`min-h-[86px] rounded-xl border px-2.5 py-2 transition ${
                  day.trained
                    ? "border-emerald-300/70 bg-emerald-500/10"
                    : "border-[color:var(--border)] bg-[color:var(--bg)]"
                } ${day.isToday ? "ring-2 ring-blue-400/30" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)] font-semibold">
                    {day.weekday}
                  </span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      day.trained ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                </div>
                <p className="mt-1 text-xs font-semibold text-[color:var(--text)]">
                  {day.label}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-[color:var(--text-muted)] line-clamp-2">
                  {day.routineShort}
                </p>
                {day.trained && (
                  <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
                    {day.sessions} ses. · {day.minutes} min
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section className="card" variants={presets.card}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-[color:var(--text)]">
                Ultimos 3 meses
              </h3>
              <p className="text-xs text-[color:var(--text-muted)]">
                Dias entrenados sobre dias del mes
              </p>
            </div>
            <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-1 text-[10px] font-semibold text-[color:var(--text-muted)]">
              Mensual
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr,260px]">
            <div className="h-64 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
              <ResponsiveBar
                data={threeMonthSummary}
                keys={["entrenamientos"]}
                indexBy="month"
                margin={{ top: 12, right: 10, bottom: 36, left: 34 }}
                padding={0.35}
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={["#2563eb"]}
                borderRadius={6}
                enableGridY
                enableLabel
                label={(bar) => bar.data.ratio}
                labelTextColor="#ffffff"
                axisBottom={{ tickSize: 0, tickPadding: 10 }}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 8,
                  tickValues: 4,
                }}
                theme={{
                  textColor: "var(--text-muted)",
                  grid: {
                    line: {
                      stroke: "var(--border)",
                      strokeWidth: 1,
                      opacity: 0.35,
                    },
                  },
                  axis: {
                    ticks: {
                      text: { fill: "var(--text-muted)", fontSize: 11 },
                    },
                  },
                  labels: {
                    text: { fontSize: 12, fontWeight: 700 },
                  },
                  tooltip: {
                    container: {
                      background: "var(--card)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
                    },
                  },
                }}
                tooltip={({ data }) => (
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs shadow-md">
                    <p className="font-semibold text-[color:var(--text)]">
                      {data.month}
                    </p>
                    <p className="text-[color:var(--text-muted)]">
                      {data.ratio} dias entrenados
                    </p>
                    <p className="mt-1 text-[color:var(--text-muted)]">
                      {data.sesiones} sesiones registradas
                    </p>
                  </div>
                )}
              />
            </div>

            <div className="grid gap-2">
              {threeMonthSummary.map((item) => (
                <div
                  key={item.month}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[color:var(--text)]">
                      {item.month}
                    </p>
                    <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-600">
                      {item.ratio}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {item.sesiones} entrenamientos registrados
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}

export default Dashboard;
