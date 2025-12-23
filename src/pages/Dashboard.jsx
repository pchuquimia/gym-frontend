import { useEffect, useMemo, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Flame,
  Target,
  Activity,
  Sun,
  Clock,
  MapPin,
} from "lucide-react";
import TopBar from "../components/layout/TopBar";
import { api } from "../services/api";
import { presets } from "../utils/motion";

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
            if (err.message?.toLowerCase?.().includes("not found")) {
              setSummarySupported(false);
            } else {
              throw err;
            }
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

          // Agrupar por semana ISO (fallback)
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
  }, [range, summarySupported]);

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

  const yValues = summary.chart.map((p) => Number(p.y || 0));
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
      className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl px-4 md:px-6 pb-10 space-y-4 lg:space-y-6"
    >
      {/* Header tipo captura */}
      <TopBar
        variant="dashboard"
        subtitle="Resumen semanal"
        title="Tu progreso"
        meta={`${summary.totalVolume.toLocaleString()} kg·reps · ${
          summary.sessionsCount
        } sesiones`}
        ctaLabel="Registrar"
        onCta={() => go("registrar")}
      />

      {/* Tabs (segmented control) */}
      <div className="flex items-center justify-center lg:justify-end">
        <div
          className="
            inline-flex items-center gap-1
            rounded-full
            border border-[color:var(--border)]
            bg-[color:var(--card)]
            p-1
          "
        >
          {rangeOptions.map((opt) => {
            const active = range === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={[
                  "h-9 px-4 rounded-full text-sm font-medium transition",
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

      <div className="grid gap-4 lg:grid-cols-[2.2fr_1fr] lg:items-start">
        <div className="space-y-4">
      {/* Volumen total (card grande) */}
      <motion.div className="card" variants={presets.card}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[color:var(--text-muted)]">
              Volumen total
            </p>
            <p className="mt-1 text-2xl font-bold text-[color:var(--text)]">
              {summary.totalVolume.toLocaleString()}{" "}
              <span className="text-base font-semibold text-[color:var(--text-muted)]">
                kg
              </span>
            </p>
            <p className="mt-2 text-xs text-emerald-600 inline-flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Tendencia basada en periodo
            </p>
          </div>

          <div className="shrink-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 grid place-items-center">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Cards pequeñas: Sesiones + Nuevos PRs */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div className="card" variants={presets.card}>
          <p className="text-xs font-medium text-[color:var(--text-muted)]">
            Sesiones
          </p>
          <p className="mt-1 text-2xl font-bold text-[color:var(--text)]">
            {summary.sessionsCount}
          </p>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Periodo actual
          </p>
        </motion.div>

        <motion.div className="card" variants={presets.card}>
          <p className="text-xs font-medium text-[color:var(--text-muted)]">
            Nuevos PRs
          </p>
          <div className="mt-1 flex items-end gap-2">
            <p className="text-2xl font-bold text-[color:var(--text)]">
              {summary.prs}
            </p>
            <Flame className="h-4 w-4 text-amber-500 mb-1" />
          </div>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Sin records
          </p>
        </motion.div>
      </div>

      {/* Tendencia de carga (card grande) */}
      <motion.section className="card" variants={presets.card}>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[color:var(--text)]">
            Tendencia de carga
          </h3>
          <p className="text-xs text-[color:var(--text-muted)]">
            Volumen Total · Vista {rangeLabel}
          </p>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[color:var(--text-muted)]">Volumen</span>
            <span className="font-semibold text-[color:var(--text)]">
              {summary.totalVolume.toLocaleString()} kg
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[color:var(--text-muted)]">
              Promedio/sesión
            </span>
            <span className="font-semibold text-[color:var(--text)]">
              {avg.toLocaleString()} kg
            </span>
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
        </div>
      </motion.section>

      {/* Última sesión */}
      <motion.div className="card" variants={presets.card}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[color:var(--text)]">
            Última sesión
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
          <div className="mt-3 space-y-2">
            <p className="text-base font-bold text-[color:var(--text)]">
              {last.routineName || "Sin rutina"}
            </p>

            <p className="text-xs text-[color:var(--text-muted)] flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {Math.round((last.durationSeconds || 0) / 60)} min
              </span>
              <span className="text-[color:var(--border)]">•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Sede: {last.branch || "N/A"}
              </span>
            </p>

            <div className="mt-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2">
              <p className="text-sm text-[color:var(--text-muted)]">
                Volumen:{" "}
                <span className="font-bold text-[color:var(--text)]">
                  {last.totalVolume?.toLocaleString?.() || 0} kg·reps
                </span>
              </p>
            </div>

            <button
              type="button"
              className="text-sm font-semibold text-blue-600 inline-flex items-center gap-1 mt-1"
              onClick={() => go("historial")}
            >
              Ver detalles completos →
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[color:var(--text-muted)]">
            Aún no registras entrenamientos.
          </p>
        )}
      </motion.div>

        </div>
        <div className="space-y-4">
      {/* Progreso de objetivos */}
      <motion.div className="card" variants={presets.card}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[color:var(--text)]">
              Progreso de objetivos
            </h3>
            <p className="text-sm text-[color:var(--text-muted)]">
              Configura tus objetivos para visualizar tu avance.
            </p>
          </div>

          <button
            type="button"
            aria-label="Editar objetivos"
            className="
              h-10 w-10 rounded-full
              border border-[color:var(--border)]
              bg-[color:var(--bg)]
              grid place-items-center
              hover:bg-[color:var(--card)]
              transition
            "
            onClick={() => go("objetivos")}
          >
            <Target className="h-4 w-4 text-[color:var(--text-muted)]" />
          </button>
        </div>

        {/* Si quieres mostrar barras aquí, descomenta:
        <div className="mt-4 space-y-3">
          {objectives.length ? (
            objectives.map((obj, idx) => {
              const pct = obj.goal
                ? Math.min(100, Math.round((obj.value / obj.goal) * 100))
                : 0;
              const palette = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500"];
              const barColor = palette[idx % palette.length];
              return (
                <div key={obj.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[color:var(--text)]">{obj.label}</span>
                    <span className="text-xs text-[color:var(--text-muted)]">
                      {obj.value} / {obj.goal} {obj.unit || ""}
                    </span>
                  </div>
                  <div className="mt-2 w-full h-2 rounded-full bg-[color:var(--border)] overflow-hidden">
                    <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-[color:var(--text-muted)] mt-3">
              Configura tus objetivos en la página de Objetivos.
            </p>
          )}
        </div>
        */}
      </motion.div>

      {/* Resumen rápido */}
      <motion.div className="card" variants={presets.card}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[color:var(--text)]">
              Resumen rápido
            </h3>
            <p className="text-sm text-[color:var(--text-muted)]">
              Navegación rápida
            </p>
          </div>
          <div className="h-9 w-9 rounded-full bg-[color:var(--bg)] border border-[color:var(--border)] grid place-items-center">
            <Activity className="h-4 w-4 text-[color:var(--text-muted)]" />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {[
            { label: "Registrar entrenamiento de hoy", key: "registrar" },
            { label: "Ver historial completo", key: "historial" },
            { label: "Analítica por ejercicio", key: "ejercicio_analitica" },
            { label: "Gestionar rutinas", key: "rutinas" },
          ].map((item) => (
            <button
              key={item.key}
              className="
                w-full rounded-2xl
                border border-[color:var(--border)]
                bg-[color:var(--card)]
                px-4 py-3 text-left
                text-sm font-medium text-[color:var(--text)]
                hover:bg-[color:var(--bg)]
                transition
                flex items-center justify-between
              "
              onClick={() => go(item.key)}
              type="button"
            >
              <span>{item.label}</span>
              <span className="text-[color:var(--text-muted)]">›</span>
            </button>
          ))}
        </div>
      </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default Dashboard;
