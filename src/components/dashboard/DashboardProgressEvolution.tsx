import { memo, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import AppChart from "../progress/AppChart";
import { fetchProgressTrainings } from "../../hooks/useProgressData";
import { getTrainingPlansQueryKey } from "../../queries/trainingPlanQueries";
import { api } from "../../services/api";
import {
  dateLabel,
  daysBetween,
  PERIODS,
  prepareTrainings,
  rangeFor,
  todayKey,
  type Period,
  type Plan,
} from "../../utils/progressDashboard";
import {
  buildDashboardProgressTrend,
  planColoredSeries,
} from "../../utils/dashboardProgressTrend";
import "./dashboard-progress-evolution.css";

const PERIOD_LABELS: Record<Period, string> = {
  "7D": "7D",
  "1M": "1M",
  "3M": "3M",
  "6M": "6M",
  "1Y": "1A",
  ALL: "Todo",
};
const EMPTY_PLANS: Plan[] = [];
const STATUS_LABELS = {
  improving: "Mejorando",
  steady: "Manteniendo",
  declining: "Bajando",
};

function DashboardProgressEvolution({ ownerId }: { ownerId: string }) {
  const [period, setPeriod] = useState<Period>("1M");
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = dialog.current;
    const trigger = previewButton.current;
    if (!node || !open) return;
    node.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["trainings", "progress-full-v1", ownerId],
    queryFn: ({ signal }) => fetchProgressTrainings(ownerId, signal),
    enabled: Boolean(ownerId),
    staleTime: 60_000,
    retry: 1,
  });
  const plansQuery = useQuery<Plan[]>({
    queryKey: getTrainingPlansQueryKey(ownerId),
    queryFn: () => api.getTrainingPlans(ownerId),
    enabled: Boolean(ownerId),
    staleTime: 60_000,
    retry: 1,
  });
  const sessions = useMemo(() => prepareTrainings(data || []), [data]);
  const today = todayKey();
  const { from, to } = rangeFor(period, today, sessions[0]?.date);
  const bucket =
    daysBetween(from, to) <= 7
      ? "day"
      : daysBetween(from, to) <= 365
        ? "week"
        : "month";
  const trend = useMemo(
    () =>
      buildDashboardProgressTrend(
        sessions,
        plansQuery.data || EMPTY_PLANS,
        from,
        to,
        bucket,
      ),
    [sessions, plansQuery.data, from, to, bucket],
  );
  const chartLabels = useMemo(
    () =>
      trend.points.map((point) =>
        new Date(`${point.date}T12:00:00Z`).toLocaleDateString("es-BO", {
          ...(bucket === "month"
            ? { year: "2-digit" as const }
            : { day: "numeric" as const }),
          month: "short",
          timeZone: "UTC",
        }),
      ),
    [trend, bucket],
  );
  const chartSeries = useMemo(() => planColoredSeries(trend), [trend]);
  const previewChart = useMemo(() => {
    const first = trend.points.findIndex((point) => point.value !== null);
    const last = trend.points.reduce(
      (lastIndex, point, index) => (point.value !== null ? index : lastIndex),
      -1,
    );
    return {
      labels: first < 0 ? [] : chartLabels.slice(first, last + 1),
      series:
        first < 0
          ? []
          : chartSeries.map((series) => ({
              ...series,
              values: series.values.slice(first, last + 1),
            })),
    };
  }, [trend, chartLabels, chartSeries]);
  const chartContext = useMemo(
    () =>
      trend.points.map(
        (point) =>
          `${dateLabel(point.date)} · ${point.planName}\n${point.change === null ? "Sin comparación" : `${point.change > 3 ? "Mejorando" : point.change < -3 ? "Bajando" : "Manteniendo"} · ${point.change > 0 ? "+" : ""}${point.change}%`}`,
      ),
    [trend],
  );
  const hasComparablePoints = trend.comparisons > 0;
  const loading = isPending || plansQuery.isPending;
  const chartTitle = `Tendencia del rendimiento${trend.direction ? `: ${STATUS_LABELS[trend.direction]}` : ""}`;
  const chartDescription =
    "Comparamos tus marcas en los mismos ejercicios. La línea sube cuando mejoras y cada color identifica una planificación. El rendimiento parte de 100 al inicio del período.";
  const previewStatus = isError
    ? "No se pudo cargar"
    : loading
      ? "Cargando tu progreso"
      : trend.direction
        ? `${STATUS_LABELS[trend.direction]}${trend.totalChange === null ? "" : ` · ${trend.totalChange > 0 ? "+" : ""}${trend.totalChange.toLocaleString("es-BO", { maximumFractionDigits: 1 })}%`}`
        : "Aún sin suficientes registros";

  return (
    <>
      <section
        className="dashboard-progress-evolution dashboard-progress-evolution--preview"
        aria-label="Tu progreso en el tiempo"
      >
        <div className="dashboard-progress-evolution__summary">
          <strong>Rendimiento</strong>
          <small>{previewStatus}</small>
          <span>En tus ejercicios</span>
        </div>
        <div
          className="dashboard-progress-evolution__sparkline"
          aria-hidden="true"
        >
          {loading || (!isError && hasComparablePoints) ? (
            <AppChart
              loading={loading}
              title={chartTitle}
              description={chartDescription}
              labels={previewChart.labels}
              series={previewChart.series}
              unit="puntos"
              height={32}
              scale
              sparkline
              minimal
              showLegend={false}
              showDescription={false}
            />
          ) : (
            <span className="dashboard-progress-evolution__no-preview" />
          )}
          {!loading && !isError && hasComparablePoints && (
            <div className="dashboard-progress-evolution__dates">
              <span>{previewChart.labels[0]}</span>
              <span>{previewChart.labels.at(-1)}</span>
            </div>
          )}
        </div>
        <ChevronRight
          className="dashboard-progress-evolution__chevron"
          size={16}
          aria-hidden="true"
        />
        <button
          ref={previewButton}
          type="button"
          className="dashboard-progress-evolution__open"
          aria-label="Ver detalle de tu progreso en el tiempo"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        />
      </section>
      {typeof document !== "undefined" &&
        createPortal(
          <dialog
            ref={dialog}
            className="dashboard-progress-detail"
            aria-labelledby="dashboard-progress-detail-title"
            onCancel={() => setOpen(false)}
            onClose={() => setOpen(false)}
          >
            {open && (
              <>
                <header className="dashboard-progress-detail__header">
                  <button
                    type="button"
                    autoFocus
                    aria-label="Volver al dashboard"
                    onClick={() => setOpen(false)}
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <h2 id="dashboard-progress-detail-title">
                    Tu progreso en el tiempo
                  </h2>
                </header>
                <div className="dashboard-progress-detail__content">
                  <div className="dashboard-progress-evolution__heading">
                    <p>
                      {trend.direction
                        ? STATUS_LABELS[trend.direction]
                        : "Tu rendimiento"}
                    </p>
                    <select
                      className="dashboard-progress-evolution__period"
                      aria-label="Período"
                      value={period}
                      onChange={(event) =>
                        setPeriod(event.target.value as Period)
                      }
                    >
                      {PERIODS.map((value) => (
                        <option key={value} value={value}>
                          {PERIOD_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {isError ? (
                    <p
                      role="alert"
                      className="dashboard-progress-evolution__message"
                    >
                      No pudimos cargar tu progreso.{" "}
                      <button type="button" onClick={() => void refetch()}>
                        Reintentar
                      </button>
                    </p>
                  ) : !loading && !hasComparablePoints ? (
                    <p className="dashboard-progress-evolution__message">
                      Aún no hay datos suficientes para mostrar la tendencia.
                    </p>
                  ) : (
                    <AppChart
                      loading={loading}
                      title={chartTitle}
                      description={chartDescription}
                      labels={chartLabels}
                      series={chartSeries}
                      unit="puntos"
                      context={chartContext}
                      height={280}
                      scale
                      valueAxisName="Rendimiento"
                      showLegend={false}
                      showDescription
                      compactTooltip
                      minimal
                    />
                  )}
                  {!loading && !isError && hasComparablePoints && (
                    <ul
                      className="dashboard-progress-detail__plans"
                      aria-label="Planificaciones por color"
                    >
                      {Array.from(
                        new Map(
                          trend.bands
                            .filter((band) =>
                              trend.points
                                .slice(band.startIndex, band.endIndex + 1)
                                .some((point) => point.value !== null),
                            )
                            .map((band) => [band.planId, band]),
                        ).values(),
                      ).map((band) => (
                        <li key={band.planId}>
                          <i
                            style={{ background: band.color }}
                            aria-hidden="true"
                          />
                          {band.name}
                        </li>
                      ))}
                    </ul>
                  )}
                  {plansQuery.isError ? (
                    <p
                      role="alert"
                      className="dashboard-progress-evolution__message"
                    >
                      No pudimos cargar los colores de las planificaciones.{" "}
                      <button
                        type="button"
                        onClick={() => void plansQuery.refetch()}
                      >
                        Reintentar
                      </button>
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </dialog>,
          document.body,
        )}
    </>
  );
}

export default memo(DashboardProgressEvolution);
