import { useMemo, useState } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  Clock3,
  Flame,
  TrendingUp,
  Zap,
} from "lucide-react";
import { presets } from "../utils/motion";
import { useAuth } from "../context/AuthContext";
import { useTrainingData } from "../context/TrainingContext";
import { useThemeMode } from "../hooks/useThemeMode";

const DAY_MS = 24 * 60 * 60 * 1000;

function toValidDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function getDateTimestamp(value) {
  return toValidDate(value)?.getTime() || 0;
}

function getISODateKey(date) {
  return date.toISOString().slice(0, 10);
}

function titleCase(value = "") {
  return value
    .toString()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function clampText(value, max = 12) {
  const text = titleCase(value || "");
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}.` : text;
}

function getRoutineName(training = {}) {
  return training.routineName || training.routineId?.name || training.routine?.name || "Sesion";
}

function formatSessionMinutes(seconds = 0) {
  const minutes = Math.round(Number(seconds || 0) / 60);
  if (minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function getExerciseKey(exercise = {}) {
  return (
    exercise.exerciseId ||
    exercise._id ||
    exercise.id ||
    exercise.exerciseName ||
    exercise.name ||
    "exercise"
  )
    .toString()
    .toLowerCase();
}

function parsePerformance(set = {}) {
  const weight = Number(set.weight || set.peso || 0);
  const reps = Number(set.reps || set.repetitions || 0);
  if (!Number.isFinite(weight) || weight <= 0) return null;
  return {
    weight,
    reps: Number.isFinite(reps) && reps > 0 ? reps : 1,
    score: weight * (1 + (Number.isFinite(reps) && reps > 0 ? reps : 1) / 30),
  };
}

function isBetter(current, previous) {
  if (!previous) return true;
  if (current.score !== previous.score) return current.score > previous.score;
  if (current.weight !== previous.weight) return current.weight > previous.weight;
  return current.reps > previous.reps;
}

function formatCompact(value = 0) {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1000) {
    return `${(number / 1000).toFixed(number >= 10000 ? 1 : 2).replace(/\.0$/, "")}k`;
  }
  return Math.round(number).toString();
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function extractPerformances(training) {
  return (training.exercises || []).flatMap((exercise) => {
    const key = getExerciseKey(exercise);
    return (exercise.sets || [])
      .map(parsePerformance)
      .filter(Boolean)
      .map((performance) => ({ ...performance, key }));
  });
}

function countPrsInRange(trainings, startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const bestByExercise = new Map();
  let count = 0;

  trainings.forEach((training) => {
    const timestamp = getDateTimestamp(training.date);
    if (!timestamp) return;

    extractPerformances(training).forEach((performance) => {
      const best = bestByExercise.get(performance.key);
      if (timestamp < start) {
        if (isBetter(performance, best)) bestByExercise.set(performance.key, performance);
        return;
      }

      if (timestamp <= end && isBetter(performance, best)) {
        bestByExercise.set(performance.key, performance);
        count += 1;
      }
    });
  });

  return count;
}

function StatCard({ label, value, suffix, icon: Icon, tone = "emerald", children }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  };

  return (
    <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm dark:shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">{label}</p>
        {Icon ? (
          <span className={`grid h-7 w-7 place-items-center rounded-xl ${tones[tone] || tones.emerald}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-end gap-1">
        <span className="text-3xl font-black leading-none text-[color:var(--text)]">{value}</span>
        {suffix ? <span className="pb-0.5 text-xs font-bold text-[color:var(--text-muted)]">{suffix}</span> : null}
      </div>
      {children}
    </article>
  );
}

function MiniPanel({ title, value, subtitle, icon: Icon, tone = "emerald" }) {
  const color =
    tone === "amber"
      ? "text-amber-700 dark:text-amber-300"
      : tone === "blue"
        ? "text-blue-700 dark:text-blue-300"
        : "text-emerald-700 dark:text-emerald-300";

  return (
    <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">{title}</p>
        {Icon ? <Icon className={`h-3.5 w-3.5 ${color}`} /> : null}
      </div>
      <p className="mt-2 text-xl font-black text-[color:var(--text)]">{value}</p>
      {subtitle ? <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">{subtitle}</p> : null}
    </article>
  );
}

function WeekStrip({ days }) {
  return (
    <section className="grid grid-cols-7 gap-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-2 shadow-sm">
      {days.map((day) => (
        <div
          key={day.key}
          className={`rounded-xl px-1.5 py-2 text-center ${
            day.isToday
              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100"
              : "text-[color:var(--text-muted)]"
          }`}
        >
          <p className="text-[10px] font-black uppercase">{day.label}</p>
          <p
            className={`mt-1 h-4 text-[9px] font-black ${
              day.trained ? "text-[color:var(--text)]" : "text-slate-300 dark:text-slate-600"
            }`}
          >
            {day.routine || "-"}
          </p>
        </div>
      ))}
    </section>
  );
}

function ActivityThirtyDaysChart({ data, trainedDays, totalVolume, mode }) {
  const isDark = mode === "dark";

  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text)]">
            Actividad de 30 dias
          </p>
          <p className="mt-1 text-xs font-bold text-[color:var(--text-muted)]">Dias con entrenamiento registrado</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-300">
          {trainedDays}/30 dias
        </span>
      </div>

      <div className="mt-4 h-40 rounded-2xl bg-slate-50 p-2 dark:bg-slate-950/50">
        <ResponsiveBar
          data={data}
          keys={["active"]}
          indexBy="label"
          margin={{ top: 8, right: 4, bottom: 26, left: 4 }}
          padding={0.24}
          colors={({ data: item }) => (item.active > 0 ? "#34d399" : isDark ? "#1e293b" : "#e2e8f0")}
          borderRadius={4}
          enableLabel={false}
          axisTop={null}
          axisRight={null}
          axisLeft={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            tickRotation: 0,
            tickValues: 5,
          }}
          enableGridY={false}
          theme={{
            text: { fill: isDark ? "#94a3b8" : "#64748b", fontSize: 10, fontWeight: 700 },
            axis: {
              ticks: { line: { stroke: "transparent" }, text: { fill: isDark ? "#94a3b8" : "#64748b" } },
              domain: { line: { stroke: "transparent" } },
            },
          }}
          tooltip={({ data: item }) => (
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs text-[color:var(--text)] shadow-xl">
              <strong>{item.key}</strong>
              <p>{item.active > 0 ? "Entrenado" : "Sin entrenamiento"}</p>
              {item.volume > 0 ? <p>{formatCompact(item.volume)} kg</p> : null}
            </div>
          )}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[color:var(--border)] bg-slate-50 p-3 dark:bg-slate-950/40">
          <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">Dias entrenados</p>
          <p className="mt-2 text-2xl font-black text-[color:var(--text)]">{trainedDays}</p>
          <p className="mt-1 text-[11px] font-bold text-[color:var(--text-muted)]">de 30 dias</p>
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-slate-50 p-3 dark:bg-slate-950/40">
          <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">Volumen</p>
          <p className="mt-2 text-2xl font-black text-[color:var(--text)]">{formatCompact(totalVolume)} kg</p>
          <p className="mt-1 text-[11px] font-bold text-[color:var(--text-muted)]">acumulado</p>
        </div>
      </div>
    </section>
  );
}

function CollapsibleSection({ title, subtitle, meta, open, onToggle, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span>
          <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">{subtitle}</span>
          <span className="mt-1 block text-lg font-black text-[color:var(--text)]">{title}</span>
        </span>
        <span className="flex items-center gap-2">
          {meta ? <span className="text-xs font-black text-[color:var(--text-muted)]">{meta}</span> : null}
          <ChevronDown className={`h-5 w-5 text-[color:var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? <div className="border-t border-[color:var(--border)] p-4">{children}</div> : null}
    </section>
  );
}

function MonthDetailView({ detail, onBack }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-blue-700 shadow-sm dark:text-blue-200"
          aria-label="Volver a tendencia"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
            Detalle mensual
          </p>
          <h3 className="truncate text-xl font-black text-[color:var(--text)]">{detail.monthName}</h3>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">
          {detail.trainedDays} dias
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {detail.days.map((day) => (
          <article
            key={day.key}
            className={`relative min-h-[86px] rounded-2xl border p-3 shadow-sm ${
              day.active
                ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-50"
                : "border-[color:var(--border)] bg-slate-50 text-[color:var(--text)] dark:bg-slate-950/30"
            }`}
          >
            <span
              className={`absolute right-3 top-3 h-2 w-2 rounded-full ${
                day.active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            />
            <p className="text-[9px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">
              {day.weekday}
            </p>
            <p className="mt-1 text-lg font-black leading-none">{day.dayNumber}</p>
            <p className="mt-2 truncate text-[11px] font-black">{day.active ? day.routine : "Descanso"}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-[color:var(--text-muted)]">
              {day.active ? `${day.sessions} ses. · ${day.minutes}` : "Sin sesion"}
            </p>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
          Rutinas entrenadas este mes
        </p>
        <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Cuantas veces se entreno cada rutina
        </p>

        <div className="mt-3 space-y-2">
          {detail.routines.length ? (
            detail.routines.map((routine) => (
              <article key={routine.name} className="rounded-2xl border border-[color:var(--border)] bg-slate-50 p-3 dark:bg-slate-950/30">
                <p className="text-sm font-black text-[color:var(--text)]">{routine.name}</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-2xl font-black text-[color:var(--text)]">{routine.sessions}</p>
                    <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">veces entrenada</p>
                  </div>
                  <p className="text-right text-[11px] font-bold text-[color:var(--text-muted)]">
                    {formatCompact(routine.volume)} kg
                    <br />
                    {routine.minutes}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm font-semibold text-[color:var(--text-muted)]">
              No hay sesiones registradas en este mes.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Dashboard() {
  const { trainings = [] } = useTrainingData();
  const { user } = useAuth();
  const { theme } = useThemeMode();
  const [isThreeMonthsOpen, setIsThreeMonthsOpen] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);

  const orderedTrainings = useMemo(
    () => [...trainings].sort((a, b) => getDateTimestamp(a.date) - getDateTimestamp(b.date)),
    [trainings],
  );

  const now = useMemo(() => new Date(), []);
  const todayKey = getISODateKey(now);

  const weekData = useMemo(() => {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end.getTime() - 6 * DAY_MS);
    start.setHours(0, 0, 0, 0);
    const previousStart = new Date(start.getTime() - 7 * DAY_MS);
    const previousEnd = new Date(start.getTime() - 1);

    const dayMap = new Map();
    for (let index = 0; index < 7; index += 1) {
      const date = new Date(start.getTime() + index * DAY_MS);
      dayMap.set(getISODateKey(date), {
        key: getISODateKey(date),
        label: ["D", "L", "M", "M", "J", "V", "S"][date.getDay()],
        routine: "",
        trained: false,
        isToday: getISODateKey(date) === todayKey,
      });
    }

    const currentTrainings = orderedTrainings.filter((training) => {
      const timestamp = getDateTimestamp(training.date);
      return timestamp >= start.getTime() && timestamp <= end.getTime();
    });
    const previousTrainings = orderedTrainings.filter((training) => {
      const timestamp = getDateTimestamp(training.date);
      return timestamp >= previousStart.getTime() && timestamp <= previousEnd.getTime();
    });

    currentTrainings.forEach((training) => {
      const key = getISODateKey(toValidDate(training.date) || now);
      const day = dayMap.get(key);
      if (!day) return;
      day.trained = true;
      day.routine = clampText(training.routineName || training.routineId?.name || "Sesion", 6);
    });

    const currentPrs = countPrsInRange(orderedTrainings, start, end);
    const previousPrs = countPrsInRange(orderedTrainings, previousStart, previousEnd);

    return {
      days: Array.from(dayMap.values()),
      activeDays: Array.from(dayMap.values()).filter((day) => day.trained).length,
      sessions: currentTrainings.length,
      totalMinutes: Math.round(
        currentTrainings.reduce((sum, training) => sum + Number(training.durationSeconds || 0), 0) / 60,
      ),
      totalVolume: currentTrainings.reduce((sum, training) => sum + Number(training.totalVolume || 0), 0),
      currentPrs,
      prDiff: currentPrs - previousPrs,
      previousSessions: previousTrainings.length,
    };
  }, [now, orderedTrainings, todayKey]);

  const monthActivity = useMemo(() => {
    const map = new Map();
    for (let index = 29; index >= 0; index -= 1) {
      const date = new Date(now.getTime() - index * DAY_MS);
      const key = getISODateKey(date);
      map.set(key, {
        key,
        label: `${date.getDate()}/${date.getMonth() + 1}`,
        sessions: 0,
        volume: 0,
        routine: "",
      });
    }

    trainings.forEach((training) => {
      const date = toValidDate(training.date);
      if (!date) return;
      const key = getISODateKey(date);
      const day = map.get(key);
      if (!day) return;
      day.sessions += 1;
      day.volume += Number(training.totalVolume || 0);
      day.routine = clampText(training.routineName || training.routineId?.name || "Sesion", 16);
    });

    const days = Array.from(map.values());
    days.forEach((day) => {
      day.active = day.sessions > 0 ? 1 : 0;
    });
    const trainedDays = days.filter((day) => day.sessions > 0).length;
    const totalSessions = days.reduce((sum, day) => sum + day.sessions, 0);
    const totalVolume = days.reduce((sum, day) => sum + day.volume, 0);

    return { days, trainedDays, totalSessions, totalVolume };
  }, [now, trainings]);

  const threeMonthSummary = useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat("es-BO", { month: "short" });
    const map = new Map();

    for (let index = 2; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      map.set(key, {
        key,
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        month: titleCase(monthFormatter.format(date).replace(".", "")),
        sessions: 0,
        volume: 0,
        minutes: 0,
      });
    }

    trainings.forEach((training) => {
      const date = toValidDate(training.date);
      if (!date) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const month = map.get(key);
      if (!month) return;
      month.sessions += 1;
      month.volume += Number(training.totalVolume || 0);
      month.minutes += Math.round(Number(training.durationSeconds || 0) / 60);
    });

    return Array.from(map.values());
  }, [now, trainings]);

  const selectedMonthDetail = useMemo(() => {
    const selected = threeMonthSummary.find((month) => month.key === selectedMonthKey);
    if (!selected) return null;

    const weekdayFormatter = new Intl.DateTimeFormat("es-BO", { weekday: "short" });
    const daysInMonth = new Date(selected.year, selected.monthIndex + 1, 0).getDate();
    const dayMap = new Map();

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const date = new Date(selected.year, selected.monthIndex, dayNumber);
      const key = getISODateKey(date);
      dayMap.set(key, {
        key,
        weekday: weekdayFormatter.format(date).replace(".", "").toUpperCase(),
        dayNumber: String(dayNumber).padStart(2, "0"),
        active: false,
        sessions: 0,
        seconds: 0,
        volume: 0,
        routine: "",
      });
    }

    const routines = new Map();

    trainings.forEach((training) => {
      const date = toValidDate(training.date);
      if (!date || date.getFullYear() !== selected.year || date.getMonth() !== selected.monthIndex) return;

      const day = dayMap.get(getISODateKey(date));
      if (!day) return;

      const routineName = getRoutineName(training);
      const volume = Number(training.totalVolume || 0);
      const seconds = Number(training.durationSeconds || 0);

      day.active = true;
      day.sessions += 1;
      day.seconds += seconds;
      day.volume += volume;
      day.routine = day.routine ? `${day.routine}, ${clampText(routineName, 12)}` : clampText(routineName, 18);

      const routine = routines.get(routineName) || {
        name: routineName,
        sessions: 0,
        volume: 0,
        seconds: 0,
      };
      routine.sessions += 1;
      routine.volume += volume;
      routine.seconds += seconds;
      routines.set(routineName, routine);
    });

    const days = Array.from(dayMap.values()).map((day) => ({
      ...day,
      minutes: formatSessionMinutes(day.seconds),
    }));

    return {
      ...selected,
      monthName: selected.month,
      days,
      trainedDays: days.filter((day) => day.active).length,
      routines: Array.from(routines.values())
        .sort((a, b) => b.sessions - a.sessions || b.volume - a.volume)
        .map((routine) => ({
          ...routine,
          minutes: formatSessionMinutes(routine.seconds),
        })),
    };
  }, [selectedMonthKey, threeMonthSummary, trainings]);

  const monthPrs = useMemo(() => {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end.getTime() - 29 * DAY_MS);
    start.setHours(0, 0, 0, 0);
    return countPrsInRange(orderedTrainings, start, end);
  }, [now, orderedTrainings]);

  const recoveryScore = Math.max(52, Math.min(94, 88 - weekData.sessions * 4 + Math.max(0, 4 - weekData.activeDays) * 3));
  const profileName = user?.name || "Atleta";
  const avatarUrl = user?.avatar || user?.photo || user?.image;
  const isDark = theme === "dark";

  return (
    <motion.div
      {...presets.fadeUp}
      className="mx-auto w-full max-w-md space-y-4 pb-10 text-[color:var(--text)] md:max-w-4xl"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic leading-[0.9] tracking-tight text-blue-700 dark:text-blue-100">
            APEX
            <br />
            PERFORMANCE
          </h1>
          <p className="mt-3 text-sm font-semibold text-[color:var(--text-muted)]">Semana activa</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-blue-700 shadow-sm dark:text-blue-100"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" />
          </button>
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-sm font-black text-blue-700 shadow-sm dark:text-blue-100">
            {avatarUrl ? <img src={avatarUrl} alt={profileName} className="h-full w-full object-cover" /> : getInitials(profileName)}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Dias activos" value={`${weekData.activeDays}/7`} icon={CalendarDays} tone="emerald">
          <div className="mt-3 grid grid-cols-7 gap-1">
            {weekData.days.map((day) => (
              <span
                key={day.key}
                className={`h-1.5 rounded-full ${day.trained ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`}
              />
            ))}
          </div>
        </StatCard>
        <StatCard label="Sesiones" value={weekData.sessions} icon={BarChart3} tone="blue" />
        <StatCard label="Tiempo total" value={weekData.totalMinutes || 0} suffix="min" icon={Clock3} tone="amber" />
        <StatCard
          label="Vs anterior"
          value={`${weekData.prDiff >= 0 ? "+" : ""}${weekData.prDiff}`}
          suffix="PRs"
          icon={TrendingUp}
          tone="emerald"
        />
      </div>

      <WeekStrip days={weekData.days} />

      <div className="grid grid-cols-2 gap-3">
        <article className="row-span-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]">Recovery</p>
            <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
          </div>
          <div className="mt-5 grid place-items-center">
            <div className="grid h-24 w-24 place-items-center rounded-full border-[10px] border-emerald-400/80 bg-emerald-400/10 shadow-[0_0_26px_rgba(52,211,153,0.25)]">
              <span className="text-2xl font-black text-[color:var(--text)]">{recoveryScore}%</span>
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] font-semibold text-[color:var(--text-muted)]">
            Optimo para carga pesada
          </p>
        </article>

        <MiniPanel
          title="Carga semanal"
          value={`${formatCompact(weekData.totalVolume)} kg`}
          subtitle={`${weekData.sessions} sesiones`}
          icon={TrendingUp}
          tone="emerald"
        />
        <MiniPanel title="PRs este mes" value={monthPrs} subtitle="records personales" icon={Flame} tone="amber" />
      </div>

      <ActivityThirtyDaysChart
        data={monthActivity.days}
        trainedDays={monthActivity.trainedDays}
        totalVolume={monthActivity.totalVolume}
        mode={theme}
      />

      <CollapsibleSection
        title="Ultimos 3 meses"
        subtitle={selectedMonthDetail ? "Mes seleccionado" : "Tendencia"}
        meta={`${formatCompact(threeMonthSummary.reduce((sum, item) => sum + item.volume, 0))} kg`}
        open={isThreeMonthsOpen}
        onToggle={() => {
          setIsThreeMonthsOpen((value) => !value);
          if (isThreeMonthsOpen) setSelectedMonthKey(null);
        }}
      >
        {selectedMonthDetail ? (
          <MonthDetailView detail={selectedMonthDetail} onBack={() => setSelectedMonthKey(null)} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <div className="h-56 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
              <ResponsiveBar
                data={threeMonthSummary}
                keys={["volume"]}
                indexBy="month"
                margin={{ top: 12, right: 8, bottom: 28, left: 46 }}
                padding={0.35}
                colors="#60a5fa"
                borderRadius={6}
                enableLabel={false}
                axisTop={null}
                axisRight={null}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 8,
                  tickValues: 4,
                  format: (value) => `${formatCompact(value)}`,
                }}
                axisBottom={{ tickSize: 0, tickPadding: 8 }}
                theme={{
                  text: { fill: isDark ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: 700 },
                  grid: { line: { stroke: isDark ? "#1e293b" : "#e2e8f0", strokeDasharray: "3 3" } },
                  axis: {
                    ticks: { line: { stroke: "transparent" }, text: { fill: isDark ? "#94a3b8" : "#64748b" } },
                    domain: { line: { stroke: "transparent" } },
                  },
                }}
                gridYValues={4}
                onClick={(bar) => setSelectedMonthKey(bar.data.key)}
                tooltip={({ data }) => (
                  <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs text-[color:var(--text)] shadow-xl">
                    <strong>{data.month}</strong>
                    <p>{data.sessions} sesiones</p>
                    <p>{formatCompact(data.volume)} kg</p>
                    <p className="mt-1 text-[10px] font-bold text-[color:var(--text-muted)]">Toca para ver detalle</p>
                  </div>
                )}
              />
            </div>

            <div className="space-y-3">
              {threeMonthSummary.map((month) => (
                <button
                  type="button"
                  key={month.key}
                  onClick={() => setSelectedMonthKey(month.key)}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-slate-50 p-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50 dark:bg-slate-950/40 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-black text-[color:var(--text)]">{month.month}</p>
                    <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">{month.sessions} sesiones</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[color:var(--text-muted)]">
                    <span>{formatCompact(month.volume)} kg</span>
                    <span>{month.minutes} min</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>
    </motion.div>
  );
}

export default Dashboard;
