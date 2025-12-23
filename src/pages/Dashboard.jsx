import { useEffect, useMemo, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { motion } from "framer-motion";
import { Plus, Sun, Flame, TrendingUp, Target, Activity } from "lucide-react";
import TopBar from "../components/layout/TopBar";
import { api } from "../services/api";
import { motionTokens, presets } from "../utils/motion";
import { Clock, MapPin } from "lucide-react";
const chartTheme = {
  background: "transparent",
  textColor: "#475569",
  axis: {
    domain: { line: { stroke: "#e2e8f0", strokeWidth: 1 } },
    ticks: {
      line: { stroke: "#e2e8f0", strokeWidth: 1 },
      text: { fill: "#475569", fontSize: 11 },
    },
    legend: { text: { fill: "#475569", fontSize: 12 } },
  },
  grid: { line: { stroke: "#e2e8f0", strokeWidth: 0.6, opacity: 0.12 } },
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

function Dashboard({ onNavigate }) {
  const [range, setRange] = useState("7");
  const [summary, setSummary] = useState({
    chart: [],
    totalVolume: 0,
    sessionsCount: 0,
    prs: 0,
    recentSessions: [],
    objectives: [],
  });
  const [loading, setLoading] = useState(false);
  const [prefGoals, setPrefGoals] = useState([]);
  const [summarySupported, setSummarySupported] = useState(true);

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

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      const days = Number(range);
      const today = new Date();
      const to = today.toISOString().slice(0, 10);
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - (days - 1));
      const from = fromDate.toISOString().slice(0, 10);
      try {
        let data;
        const useSummary = summarySupported;
        if (useSummary) {
          try {
            data = await api.getTrainingsSummary({ from, to });
          } catch (err) {
            if (err.message?.toLowerCase()?.includes("not found")) {
              setSummarySupported(false);
            } else {
              throw err;
            }
          }
        }
        // Fallback si el backend no tiene /summary o falló
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
        setSummary({
          chart: Array.isArray(data.chart) ? data.chart : [],
          totalVolume: Number(data.totalVolume) || 0,
          sessionsCount: Number(data.sessionsCount) || 0,
          prs: Number(data.prs) || 0,
          recentSessions: Array.isArray(data.recentSessions)
            ? data.recentSessions
            : [],
          objectives: Array.isArray(data.objectives) ? data.objectives : [],
        });
      } catch (err) {
        console.error("No se pudo cargar el resumen", err);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, [range]);

  // Carga de objetivos desde preferencias (goals)
  useEffect(() => {
    async function loadPrefs() {
      try {
        const pref = await api.getPreference();
        if (pref?.goals) {
          const mapped = Object.entries(pref.goals).map(([key, obj]) => ({
            key,
            label: obj.label || key,
            value: Number(obj.current) || 0,
            goal: Number(obj.target) || 0,
            unit: obj.unit || "kg",
          }));
          setPrefGoals(mapped);
        }
      } catch (err) {
        console.warn("No se pudo cargar preferencias", err?.message);
      }
    }
    loadPrefs();
  }, []);

  const yValues = summary.chart.map((p) => p.y);
  const minY = yValues.length ? Math.min(...yValues) * 0.98 : "auto";
  const maxY = yValues.length ? Math.max(...yValues) * 1.05 : "auto";
  const last = summary.recentSessions?.[0] || null;
  const rangeLabel =
    rangeOptions.find((o) => o.id === range)?.label ?? "Semanal";
  const avg = summary.sessionsCount
    ? Math.round(summary.totalVolume / summary.sessionsCount)
    : 0;
  const objectives = useMemo(() => {
    const backendObjectives = Array.isArray(summary.objectives)
      ? summary.objectives
      : [];
    const list = backendObjectives.length ? backendObjectives : prefGoals;
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 3);
  }, [summary.objectives, prefGoals]);

  return (
    <motion.div
      variants={presets.page}
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-4"
    >
      <TopBar
        subtitle={`Resumen ${rangeLabel.toLowerCase()}`}
        title="Tu progreso"
        meta={`${summary.totalVolume.toLocaleString()} kg·reps · ${
          summary.sessionsCount
        } sesiones · prom ${avg.toLocaleString()}`}
        ctaLabel="Registrar"
        onCta={() => go("registrar")}
      />

      <motion.div
        className="flex items-center justify-between gap-2 mb-4"
        variants={presets.card}
        whileHover={presets.hover}
        whileTap={presets.press}
      >
        <div className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]"></div>
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

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-3 my-4">
        <motion.div
          className="card border border-[color:var(--border)]"
          variants={presets.card}
        >
          <p className="text-xs font-medium leading-5 text-[color:var(--text-muted)]">
            Volumen total
          </p>
          <p className="text-3xl font-semibold leading-9">
            {summary.totalVolume.toLocaleString()} kg
          </p>
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" /> Tendencia basada en periodo
          </p>
        </motion.div>
        <motion.div
          className="card border border-[color:var(--border)]"
          variants={presets.card}
        >
          <p className="text-xs font-medium leading-5 text-[color:var(--text-muted)]">
            Entrenamientos
          </p>
          <p className="text-3xl font-semibold leading-9">
            {summary.sessionsCount}
          </p>
          <p className="text-xs text-[color:var(--text-muted)]">
            Periodo seleccionado
          </p>
        </motion.div>

        <motion.div
          className="card border border-[color:var(--border)]"
          variants={presets.card}
        >
          <p className="text-xs font-medium leading-5 text-[color:var(--text-muted)]">
            Nuevos PRs
          </p>
          <p className="text-3xl font-semibold leading-9">{summary.prs}</p>
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <Flame className="w-4 h-4" /> Mejores marcas detectadas
          </p>
        </motion.div>
      </div>
      <motion.section
        className="card border border-[color:var(--border)]"
        variants={presets.card}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium leading-6 text-[color:var(--text-muted)]">
              Volumen Total
            </p>
            <h3 className="text-lg font-semibold leading-7">
              Tendencia de carga
            </h3>
          </div>
          <span className="text-xs font-medium leading-5 text-[color:var(--text-muted)]">
            Vista {rangeOptions.find((o) => o.id === range)?.label}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] px-3 py-2 bg-[color:var(--bg)]/60">
            <span className="text-[color:var(--text-muted)]">
              Volumen periodo
            </span>
            <span className="font-semibold text-[color:var(--text)]">
              {summary.totalVolume.toLocaleString()} kg·reps
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] px-3 py-2 bg-[color:var(--bg)]/60">
            <span className="text-[color:var(--text-muted)]">Sesiones</span>
            <span className="font-semibold text-[color:var(--text)]">
              {summary.sessionsCount}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] px-3 py-2 bg-[color:var(--bg)]/60">
            <span className="text-[color:var(--text-muted)]">
              Promedio sesion
            </span>
            <span className="font-semibold text-[color:var(--text)]">
              {summary.sessionsCount
                ? Math.round(
                    summary.totalVolume / summary.sessionsCount
                  ).toLocaleString()
                : 0}{" "}
              kg·reps
            </span>
          </div>
        </div>
        <motion.div className="h-72 w-full" variants={presets.chart}>
          {summary.chart.length ? (
            <ResponsiveLine
              data={[{ id: "Volumen", data: summary.chart }]}
              theme={chartTheme}
              margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: minY, max: maxY, stacked: false }}
              axisBottom={{
                tickSize: 0,
                tickPadding: 10,
                tickRotation: 0,
                format: (v) => (v || "").replace(/\d{4}-W/, "W"),
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                tickFormat: (v) => `${v} kg·reps`,
              }}
              curve="monotoneX"
              enablePoints={false}
              pointBorderWidth={2}
              enableArea
              areaOpacity={0.75}
              colors={["#15803d"]}
              useMesh
              enableGridX={false}
              areaBaselineValue={minY === "auto" ? 0 : minY}
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
                  <p className="text-[color:var(--text-muted)] mb-1">
                    {point.data.xFormatted}
                  </p>
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    {Number(point.data.y).toLocaleString()} kg·reps
                  </p>
                </div>
              )}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[color:var(--text-muted)]">
              {loading ? "Cargando..." : "Sin datos suficientes"}
            </div>
          )}
        </motion.div>
      </motion.section>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div
            className="card border border-[color:var(--border)]"
            variants={presets.card}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold leading-7">Ultima sesion</h3>
              <span className="text-xs font-medium leading-5 text-[color:var(--text-muted)]">
                {last?.date
                  ? new Date(`${last.date}T00:00:00`).toLocaleDateString(
                      "es-ES",
                      { day: "2-digit", month: "short" }
                    )
                  : "--"}
              </span>
            </div>
            {last ? (
              <div className="space-y-2">
                <p className="text-base font-semibold leading-6 text-primary">
                  {last.routineName || "Sin rutina"}
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  <span className="inline-flex gap-1">
                    <Clock className="h-3.5 w-3.5 " strokeWidth={3.5} />
                  </span>{" "}
                  {Math.round((last.durationSeconds || 0) / 60)} min ·
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={3.5} />
                  </span>{" "}
                  Sede: {last.branch || "N/A"}
                </p>
                <p className="text-sm text-[color:var(--text-muted)]">
                  Volumen:{" "}
                  <span className="font-bold text-black">
                    {last.totalVolume?.toLocaleString?.() || 0} kg·reps
                  </span>
                </p>
                <button
                  type="button"
                  className="text-sm font-semibold text-primary inline-flex items-center gap-1 mt-1"
                  onClick={() => go("historial")}
                >
                  Ver detalles completos →
                </button>
              </div>
            ) : (
              <p className="text-sm text-[color:var(--text-muted)]">
                Aun no registras entrenamientos.
              </p>
            )}
          </motion.div>

          <motion.div
            className="card border border-[color:var(--border)]"
            variants={presets.card}
          >
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
              {objectives.length ? (
                objectives.map((obj, idx) => {
                  const pct = obj.goal
                    ? Math.min(100, Math.round((obj.value / obj.goal) * 100))
                    : 0;
                  const palette = [
                    "bg-blue-500",
                    "bg-violet-500",
                    "bg-emerald-500",
                    "bg-amber-500",
                  ];
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
                        <div
                          className={`h-2 rounded-full ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs font-medium mt-1 text-emerald-600 dark:text-emerald-400">
                        {pct}% completado
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[color:var(--text-muted)]">
                  Configura tus objetivos en la pagina de Objetivos.
                </p>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          className="card border border-[color:var(--border)]"
          variants={presets.card}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold leading-7">Resumen rapido</h3>
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
              Analitica por ejercicio
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
