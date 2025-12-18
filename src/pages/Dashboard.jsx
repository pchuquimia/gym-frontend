import { useMemo, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { motion } from "framer-motion";
import { Plus, Sun, Flame, TrendingUp, Target, Activity, Circle, CircleDot } from "lucide-react";
import TopBar from "../components/layout/TopBar";
import { useTrainingData } from "../context/TrainingContext";
import { motionTokens, presets } from "../utils/motion";

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
const toIsoWeek = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
};

const chartTheme = {
  background: "transparent",
  textColor: "#475569",
  axis: {
    domain: { line: { stroke: "#e2e8f0", strokeWidth: 1 } },
    ticks: { line: { stroke: "#e2e8f0", strokeWidth: 1 }, text: { fill: "#475569", fontSize: 11 } },
    legend: { text: { fill: "#475569", fontSize: 12 } },
  },
  grid: { line: { stroke: "#e2e8f0", strokeWidth: 0.6, opacity: 0.15 } },
  tooltip: {
    container: {
      background: "var(--card, #0f172a)",
      color: "var(--text, #e2e8f0)",
      fontSize: 12,
      borderRadius: 10,
      padding: 10,
      boxShadow: "0 8px 20px rgba(15,23,42,0.15)",
      border: "1px solid var(--border, #e2e8f0)",
    },
  },
};

const rangeOptions = [
  { id: "7", label: "Semanal", days: 7 },
  { id: "30", label: "Mensual", days: 30 },
  { id: "90", label: "Trimestral", days: 90 },
];

function computeVolume(training) {
  return (training?.exercises || []).reduce((acc, ex) => {
    const sets = ex.sets || [];
    return (
      acc +
      sets.reduce((s, set) => {
        const w = Number(set.weightKg || 0);
        const r = Number(set.reps || 0);
        return s + w * r;
      }, 0)
    );
  }, 0);
}

function Dashboard({ onNavigate }) {
  const { trainings = [], goals = {} } = useTrainingData();
  const [range, setRange] = useState("7");

  const go = (key) => {
    if (onNavigate) return onNavigate(key);
    if (!key) return;
    const paths = {
      registrar: "/registrar-entrenamiento",
      historial: "/historial",
      ejercicio_analitica: "/analitica-ejercicio",
      rutinas: "/rutinas",
      objetivos: "/objetivos",
    };
    const path = paths[key];
    if (path) window.location.href = path;
  };

  const sortedTrainings = useMemo(
    () =>
      [...trainings].sort(
        (a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)
      ),
    [trainings]
  );

  const todayISO = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  const data = useMemo(() => {
    const days = Number(range);
    const startDate = new Date(`${todayISO}T00:00:00`);
    startDate.setDate(startDate.getDate() - days + 1);

    const filtered = sortedTrainings.filter((t) => {
      const date = t.date || t.createdAt;
      if (!date) return false;
      const d = new Date(`${date}T00:00:00`);
      return d >= startDate;
    });

    // Volumen por semana
    const byWeek = new Map();
    filtered.forEach((t) => {
      const date = t.date || t.createdAt;
      if (!date) return;
      const wk = toIsoWeek(date);
      if (!wk) return;
      const vol = computeVolume(t);
      byWeek.set(wk, (byWeek.get(wk) || 0) + vol);
    });
    const chart = Array.from(byWeek.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([x, y]) => ({ x, y }))
      .filter((p) => p.x && Number.isFinite(p.y));

    const yValues = chart.map((p) => p.y);
    const minY = yValues.length ? Math.min(...yValues) * 0.98 : "auto";
    const maxY = yValues.length ? Math.max(...yValues) * 1.05 : "auto";

    const totalVolume = filtered.reduce((acc, t) => acc + (t.totalVolume || computeVolume(t)), 0);
    const trainingsCount = filtered.length;

    // PRs simples: contar sets que superen el mejor previo por ejercicio dentro del rango
    const bestGlobal = new Map();
    sortedTrainings.forEach((t) => {
      (t.exercises || []).forEach((ex) => {
        (ex.sets || []).forEach((s) => {
          const w = Number(s.weightKg || 0);
          const r = Number(s.reps || 0);
          const key = ex.exerciseId || ex.exerciseName;
          const current = bestGlobal.get(key);
          if (!current || w > current.w || (w === current.w && r > current.r)) {
            bestGlobal.set(key, { w, r, date: t.date || t.createdAt });
          }
        });
      });
    });
    let prs = 0;
    filtered.forEach((t) => {
      (t.exercises || []).forEach((ex) => {
        (ex.sets || []).forEach((s) => {
          const w = Number(s.weightKg || 0);
          const r = Number(s.reps || 0);
          const key = ex.exerciseId || ex.exerciseName;
          const best = bestGlobal.get(key);
          if (best && best.date === (t.date || t.createdAt) && best.w === w && best.r === r) prs += 1;
        });
      });
    });

    const last = sortedTrainings[0] || null;

    // Objetivos desde preferencias (goals), ordenados por avance desc, máx 3
    const mappedObjectives = Object.entries(goals || {})
      .map(([key, obj]) => {
        const current = Number(obj.current) || 0;
        const target = Number(obj.target) || 0;
        return {
          key,
          label: obj.label || key,
          value: current,
          goal: target,
          unit: obj.unit || "kg",
        };
      })
      .filter((o) => o.goal > 0 || o.value > 0);

    const shuffledObjectives = [...mappedObjectives];
    for (let i = shuffledObjectives.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledObjectives[i], shuffledObjectives[j]] = [shuffledObjectives[j], shuffledObjectives[i]];
    }

    const objectivesSample = shuffledObjectives.slice(0, 3);

    return { chart, totalVolume, trainingsCount, prs, last, objectives: objectivesSample, minY, maxY };
  }, [sortedTrainings, range, todayISO, goals]);

  return (
    <motion.div variants={presets.page} initial="hidden" animate="show" exit="exit" className="space-y-4">
      <TopBar
        title="Dashboard Principal"
        subtitle="Resumen optimizado de tu rendimiento profesional."
        ctaLabel="Registrar Nuevo Entrenamiento"
        onCta={() => go("registrar")}
      />

      <motion.div
        className="flex items-center justify-between gap-2 mb-4"
        variants={presets.card}
        whileHover={presets.hover}
        whileTap={presets.press}
      >
        <div className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
          <Sun className="w-4 h-4" />
          <span>Modo claro/oscuro listo</span>
        </div>
        <div className="flex items-center gap-2">
          {rangeOptions.map((opt) => (
            <button
              key={opt.id}
              className={`px-3 py-1 rounded-lg border text-sm font-medium ${
                range === opt.id
                  ? "bg-primary/10 border-primary/30 text-[color:var(--text)]"
                  : "bg-[color:var(--card)] border-[color:var(--border)] text-[color:var(--text-muted)]"
              }`}
              onClick={() => setRange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.section className="card border border-[color:var(--border)]" variants={presets.card}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium leading-6 text-[color:var(--text-muted)]">Volumen Total</p>
            <h3 className="text-lg font-semibold leading-7">Tendencia de carga</h3>
          </div>
          <span className="text-xs font-medium leading-5 text-[color:var(--text-muted)]">
            Vista {rangeOptions.find((o) => o.id === range)?.label}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] px-3 py-2 bg-[color:var(--bg)]/60">
            <span className="text-[color:var(--text-muted)]">Volumen periodo</span>
            <span className="font-semibold text-[color:var(--text)]">
              {data.totalVolume.toLocaleString()} kg·reps
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] px-3 py-2 bg-[color:var(--bg)]/60">
            <span className="text-[color:var(--text-muted)]">Cambio</span>
            <span className="font-semibold text-emerald-600">+5%</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] px-3 py-2 bg-[color:var(--bg)]/60">
            <span className="text-[color:var(--text-muted)]">Promedio sesión</span>
            <span className="font-semibold text-[color:var(--text)]">
              {data.trainingsCount ? Math.round(data.totalVolume / data.trainingsCount).toLocaleString() : 0} kg·reps
            </span>
          </div>
        </div>
        <motion.div className="h-72 w-full" variants={presets.chart}>
          {data.chart.length ? (
            <ResponsiveLine
              data={[{ id: "Volumen", data: data.chart }]}
              theme={chartTheme}
              margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: data.minY, max: data.maxY, stacked: false }}
              axisBottom={{ tickSize: 0, tickPadding: 10, tickRotation: 0, format: (v) => (v || "").replace(/\d{4}-W/, "W") }}
              axisLeft={{ tickSize: 0, tickPadding: 8, tickFormat: (v) => `${v} kg·reps` }}
              curve="monotoneX"
              enablePoints={false}
              pointBorderWidth={2}
              enableArea
              areaOpacity={0.75}
              colors={["#15803d"]}
              useMesh
              enableGridX={false}
              areaBaselineValue={data.minY}
              defs={[
                {
                  id: "volArea",
                  type: "linearGradient",
                  colors: [
                    { offset: 0, color: "#15803d", opacity: 0.75 },
                    { offset: 100, color: "#15803d", opacity: 0.25 },
                  ],
                },
              ]}
              fill={[{ match: "*", id: "volArea" }]}
              tooltip={({ point }) => (
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 shadow-md text-xs">
                  <p className="text-[color:var(--text-muted)] mb-1">{point.data.xFormatted}</p>
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    {Number(point.data.y).toLocaleString()} kg·reps
                  </p>
                </div>
              )}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[color:var(--text-muted)]">
              Sin datos suficientes
            </div>
          )}
        </motion.div>
      </motion.section>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-3 my-4">
        <motion.div className="card border border-[color:var(--border)]" variants={presets.card}>
          <p className="text-xs font-medium leading-5 text-[color:var(--text-muted)]">Volumen total</p>
          <p className="text-3xl font-semibold leading-9">{data.totalVolume.toLocaleString()} kg</p>
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" /> +5% vs. periodo previo
          </p>
        </motion.div>
        <motion.div className="card border border-[color:var(--border)]" variants={presets.card}>
          <p className="text-xs font-medium leading-5 text-[color:var(--text-muted)]">Entrenamientos</p>
          <p className="text-3xl font-semibold leading-9">{data.trainingsCount}</p>
          <p className="text-xs text-[color:var(--text-muted)]">Objetivo semanal: 4</p>
        </motion.div>
        <motion.div className="card border border-[color:var(--border)]" variants={presets.card}>
          <p className="text-xs font-medium leading-5 text-[color:var(--text-muted)]">Nuevos PRs</p>
          <p className="text-3xl font-semibold leading-9">{data.prs}</p>
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <Flame className="w-4 h-4" /> +1 vs. periodo previo
          </p>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div className="card border border-[color:var(--border)]" variants={presets.card}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold leading-7">Última sesión</h3>
              <span className="text-xs font-medium leading-5 text-[color:var(--text-muted)]">
                {data.last?.date ? formatDate(data.last.date) : "--"}
              </span>
            </div>
            {data.last ? (
              <div className="space-y-2">
                <p className="text-base font-semibold leading-6 text-primary">
                  {data.last.routineName || "Sin rutina"}
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {Math.round((data.last.durationSeconds || 0) / 60)} min · Intensidad alta
                </p>
                <ul className="text-sm leading-6 text-[color:var(--text)] space-y-1.5">
                  {(data.last.exercises || []).slice(0, 4).map((ex, idx) => {
                    const sets = ex.sets || [];
                    const best = sets.reduce(
                      (bestSet, s) => {
                        const w = Number(s.weightKg || 0);
                        if (!bestSet || w > bestSet.weightKg) return { weightKg: w, reps: s.reps || 0 };
                        return bestSet;
                      },
                      null
                    );
                    const display = best ? `${best.weightKg} kg × ${best.reps || 0}` : "--";
                    const Icon = idx === 0 ? CircleDot : Circle;
                    const iconColor =
                      idx === 0 ? "text-blue-500" : "text-[color:var(--text-muted)] dark:text-slate-500";
                    return (
                      <li key={ex.exerciseId || ex.exerciseName} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${iconColor}`} />
                          <span>{ex.exerciseName || ex.exerciseId}</span>
                        </div>
                        <span className="text-xs font-medium text-[color:var(--text-muted)]">{display}</span>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  className="text-sm font-semibold text-primary inline-flex items-center gap-1 mt-1"
                  onClick={() => go("historial")}
                >
                  Ver detalles completos →
                </button>
              </div>
            ) : (
              <p className="text-sm text-[color:var(--text-muted)]">Aún no registras entrenamientos.</p>
            )}
          </motion.div>

          <motion.div className="card border border-[color:var(--border)]" variants={presets.card}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Progreso de objetivos</h3>
              <button
                type="button"
                aria-label="Editar objetivos"
                className="p-1 rounded-full hover:bg-[color:var(--border)] transition"
                onClick={() => go("objetivos")}
              >
                <Target className="w-4 h-4 text-[color:var(--text-muted)]" />
              </button>
            </div>
            <div className="space-y-3">
              {data.objectives.map((obj, idx) => {
                const pct = Math.min(100, Math.round((obj.value / obj.goal) * 100));
                const palette = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500"];
                const barColor = palette[idx % palette.length];
                return (
                  <div key={obj.label}>
                    <div className="flex items-center justify-between text-sm leading-6 text-[color:var(--text)]">
                      <span>{obj.label}</span>
                      <span className="text-xs font-medium text-[color:var(--text-muted)]">
                        {obj.value} / {obj.goal} {obj.unit || ""}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[color:var(--border)] overflow-hidden">
                      <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs font-medium mt-1 text-emerald-600 dark:text-emerald-400">
                      {pct}% completado
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        <motion.div className="card border border-[color:var(--border)]" variants={presets.card}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold leading-7">Resumen rápido</h3>
            <Activity className="w-4 h-4 text-[color:var(--text-muted)]" />
          </div>
          <p className="text-sm leading-6 text-[color:var(--text-muted)] mb-2">
            Mira tu estado actual y navega a las secciones clave.
          </p>
          <div className="grid gap-2 text-sm">
            <button
              className="w-full rounded-lg border border-[color:var(--border)] px-3 py-2 text-left hover:bg-[color:var(--bg)] transition"
              onClick={() => go("registrar")}
            >
              Registrar entrenamiento de hoy
            </button>
            <button
              className="w-full rounded-lg border border-[color:var(--border)] px-3 py-2 text-left hover:bg-[color:var(--bg)] transition"
              onClick={() => go("historial")}
            >
              Ver historial completo
            </button>
            <button
              className="w-full rounded-lg border border-[color:var(--border)] px-3 py-2 text-left hover:bg-[color:var(--bg)] transition"
              onClick={() => go("ejercicio_analitica")}
            >
              Analítica por ejercicio
            </button>
            <button
              className="w-full rounded-lg border border-[color:var(--border)] px-3 py-2 text-left hover:bg-[color:var(--bg)] transition"
              onClick={() => go("rutinas")}
            >
              Gestionar rutinas
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default Dashboard;
