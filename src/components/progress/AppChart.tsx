import { useEffect, useId, useRef, useState } from "react";
import type { ComposeOption } from "echarts/core";
import { type BarSeriesOption, type LineSeriesOption } from "echarts/charts";
import {
  type GridComponentOption,
  type TooltipComponentOption,
  type LegendComponentOption,
  type DataZoomComponentOption,
} from "echarts/components";
import { number } from "../../utils/progressDashboard";

type Option = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
>;
export interface ChartSeries {
  name: string;
  values: (number | null)[];
  token?: string;
}
interface Props {
  title: string;
  description: string;
  labels: string[];
  series: ChartSeries[];
  unit: string;
  kind?: "line" | "bar";
  horizontal?: boolean;
  height?: number;
  loading?: boolean;
  onSelect?: (index: number) => void;
  context?: string[];
}

export default function AppChart({
  title,
  description,
  labels,
  series,
  unit,
  kind = "line",
  horizontal = false,
  height = 280,
  loading = false,
  onSelect,
  context,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const descriptionId = useId();
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    const node = container.current;
    if (!node || loading || !labels.length) return;
    let disposed = false;
    let cleanup = () => {};
    void import("./echartsRuntime")
      .then(({ init }) => {
        if (disposed) return;
        const chart = init(node, undefined, { renderer: "svg" });
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const render = () => {
          const styles = getComputedStyle(node);
          const token = (name: string) => styles.getPropertyValue(name).trim();
          const fontFamily = styles.fontFamily;
          const text = token("--text"),
            muted = token("--text-muted"),
            border = token("--border");
          const category = {
            type: "category" as const,
            data: labels,
            axisTick: { show: false },
            axisLine: { show: false },
            axisLabel: {
              color: muted,
              fontFamily,
              fontSize: 12,
              hideOverlap: true,
              width: horizontal ? 110 : 80,
              overflow: "truncate" as const,
            },
          };
          const value = {
            type: "value" as const,
            min: 0,
            splitNumber: 4,
            axisLabel: {
              color: muted,
              fontFamily,
              fontSize: 12,
              formatter: (v: number) => number(v, 0),
            },
            splitLine: {
              lineStyle: { color: border, type: "dashed" as const },
            },
          };
          const zoom = !horizontal && labels.length > 40;
          const option: Option = {
            animation: !motion.matches,
            animationDuration: 200,
            animationDurationUpdate: 200,
            textStyle: { fontFamily, color: text },
            backgroundColor: "transparent",
            aria: {
              enabled: true,
              label: {
                description: `${title}. ${description}. Tabla de datos disponible debajo.`,
              },
            },
            grid: {
              left: horizontal ? 116 : 52,
              right: 16,
              top: 20,
              bottom: zoom ? 68 : 36,
            },
            legend: {
              show: false,
              selected: Object.fromEntries(
                series.map((s) => [s.name, !hiddenSeries.includes(s.name)]),
              ),
              top: 0,
              textStyle: { color: text, fontFamily, fontSize: 13 },
              icon: "roundRect",
            },
            tooltip: {
              trigger: "axis",
              confine: true,
              renderMode: "richText",
              backgroundColor: token("--surface-raised"),
              borderColor: border,
              borderWidth: 1,
              textStyle: { color: text, fontFamily, fontSize: 13 },
              formatter: (params) => {
                const points = Array.isArray(params) ? params : [params];
                return [
                  String(points[0]?.name || title),
                  ...points.map(
                    (p) =>
                      `${p.seriesName}: ${p.value == null ? "Sin registro" : `${number(Number(p.value))} ${unit}`}`,
                  ),
                  context?.[points[0]?.dataIndex] || "",
                ]
                  .filter(Boolean)
                  .join("\n");
              },
            },
            xAxis: horizontal ? value : category,
            yAxis: horizontal ? { ...category, inverse: true } : value,
            dataZoom: zoom
              ? [
                  {
                    type: "slider",
                    bottom: 4,
                    height: 20,
                    borderColor: border,
                    fillerColor: token("--surface-subtle"),
                    textStyle: { color: muted, fontFamily },
                    handleStyle: { color: token("--accent") },
                    start: 0,
                    end: 100,
                  },
                ]
              : [],
            series: series.map((s, index) => ({
              name: s.name,
              type: kind,
              data: s.values,
              color: token(s.token || (index ? "--success" : "--accent")),
              ...(kind === "line"
                ? {
                    showSymbol: labels.length < 18,
                    symbolSize: 7,
                    connectNulls: false,
                    lineStyle: { width: 2.5 },
                    emphasis: { focus: "series" as const },
                  }
                : {
                    barMaxWidth: 28,
                    itemStyle: {
                      borderRadius: horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0],
                    },
                  }),
            })) as (LineSeriesOption | BarSeriesOption)[],
          };
          try {
            chart.setOption(option, { notMerge: true });
          } catch {
            setError(true);
          }
        };
        render();
        setReady(true);
        chart.on("click", (params) => {
          if (typeof params.dataIndex === "number")
            select.current?.(params.dataIndex);
        });
        const resize = new ResizeObserver(() => {
          chart.resize();
        });
        resize.observe(node);
        window.addEventListener("gym-theme-change", render);
        motion.addEventListener("change", render);
        cleanup = () => {
          resize.disconnect();
          window.removeEventListener("gym-theme-change", render);
          motion.removeEventListener("change", render);
          chart.dispose();
        };
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [
    title,
    description,
    labels,
    series,
    unit,
    kind,
    horizontal,
    loading,
    attempt,
    context,
    hiddenSeries,
  ]);
  return (
    <figure className="progress-chart" aria-labelledby={descriptionId}>
      <figcaption id={descriptionId} className="progress-note">
        {description}
      </figcaption>
      {series.length > 1 && (
        <div
          className="progress-chart-legend"
          role="group"
          aria-label={`Series de ${title}`}
        >
          {series.map((s) => (
            <button
              key={s.name}
              aria-pressed={!hiddenSeries.includes(s.name)}
              onClick={() =>
                setHiddenSeries((current) =>
                  current.includes(s.name)
                    ? current.filter((name) => name !== s.name)
                    : [...current, s.name],
                )
              }
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      {loading ? (
        <div
          className="progress-skeleton"
          style={{ height }}
          role="status"
          aria-label={`Cargando ${title}`}
        />
      ) : !labels.length ? (
        <p className="progress-empty">
          Todavía no hay datos suficientes para esta gráfica.
        </p>
      ) : (
        <>
          {error && (
            <p role="alert">
              No pudimos dibujar la gráfica. La tabla sigue disponible.{" "}
              <button
                onClick={() => {
                  setError(false);
                  setAttempt((n) => n + 1);
                }}
              >
                Reintentar
              </button>
            </p>
          )}
          <div className="progress-chart-stage">
            {!ready && !error && (
              <div
                className="progress-skeleton progress-chart-placeholder"
                role="status"
                aria-label={`Preparando ${title}`}
              />
            )}
            <div
              ref={container}
              style={{ height }}
              role="img"
              aria-label={title}
            />
          </div>
        </>
      )}
    </figure>
  );
}
