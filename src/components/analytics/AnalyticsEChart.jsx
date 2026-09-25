import { useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";

const formatValue = (value, unit) => {
  if (!Number.isFinite(Number(value))) return "--";
  return `${Number(value).toLocaleString("es-BO", {
    maximumFractionDigits: 1,
  })}${unit ? ` ${unit}` : ""}`;
};

export default function AnalyticsEChart({
  title,
  description,
  labels,
  series,
  unit = "",
  height = 240,
  min = 0,
  max = null,
  baseline = null,
  context = [],
}) {
  const containerRef = useRef(null);
  const descriptionId = useId();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !labels.length || !series.length) return undefined;

    let disposed = false;
    let cleanup = () => {};

    void import("../progress/echartsRuntime")
      .then(({ init }) => {
        if (disposed) return;
        const chart = init(node, undefined, { renderer: "svg" });
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

        const render = () => {
          const styles = getComputedStyle(node);
          const token = (name) => styles.getPropertyValue(name).trim();
          const fontFamily = styles.fontFamily;
          const text = token("--text");
          const muted = token("--text-muted");
          const border = token("--border");
          const surface = token("--surface-raised") || token("--card");

          chart.setOption(
            {
              animation: !motion.matches,
              animationDuration: 260,
              animationDurationUpdate: 220,
              backgroundColor: "transparent",
              textStyle: { color: text, fontFamily },
              aria: {
                enabled: true,
                label: { description: `${title}. ${description}` },
              },
              grid: { left: 46, right: 14, top: 18, bottom: 34 },
              tooltip: {
                trigger: "axis",
                confine: true,
                renderMode: "richText",
                backgroundColor: surface,
                borderColor: border,
                borderWidth: 1,
                padding: [9, 11],
                textStyle: { color: text, fontFamily, fontSize: 12 },
                axisPointer: {
                  type: "line",
                  lineStyle: { color: muted, type: "dashed" },
                },
                formatter: (params) => {
                  const points = Array.isArray(params) ? params : [params];
                  const index = points[0]?.dataIndex;
                  return [
                    String(points[0]?.axisValueLabel || ""),
                    ...points.map(
                      (point) =>
                        `${point.marker}${point.seriesName}: ${formatValue(point.value, unit)}`,
                    ),
                    Number.isInteger(index) ? context[index] : "",
                  ]
                    .filter(Boolean)
                    .join("\n");
                },
              },
              xAxis: {
                type: "category",
                data: labels,
                boundaryGap: series.every((item) => item.type === "bar"),
                axisTick: { show: false },
                axisLine: { show: false },
                axisLabel: {
                  color: muted,
                  fontFamily,
                  fontSize: 11,
                  hideOverlap: true,
                  margin: 10,
                },
              },
              yAxis: {
                type: "value",
                min,
                ...(Number.isFinite(max) ? { max } : {}),
                splitNumber: 4,
                axisTick: { show: false },
                axisLine: { show: false },
                axisLabel: {
                  color: muted,
                  fontFamily,
                  fontSize: 11,
                  formatter: (value) =>
                    Number(value).toLocaleString("es-BO", {
                      maximumFractionDigits: 0,
                    }),
                },
                splitLine: {
                  lineStyle: { color: border, type: "dashed", opacity: 0.75 },
                },
              },
              series: series.map((item, index) => {
                const color = token(
                  item.token || (index ? "--text-muted" : "--accent"),
                );
                const isBar = item.type === "bar";
                return {
                  name: item.name,
                  type: item.type || "line",
                  data: item.values,
                  color,
                  connectNulls: false,
                  smooth: !isBar,
                  showSymbol: !isBar && labels.length <= 16,
                  symbol: "circle",
                  symbolSize: index ? 5 : 7,
                  lineStyle: {
                    width: index ? 2 : 3,
                    type: item.dashed ? "dashed" : "solid",
                    opacity: index ? 0.75 : 1,
                  },
                  areaStyle:
                    item.area && !isBar ? { opacity: 0.1, color } : undefined,
                  barMaxWidth: 30,
                  itemStyle: isBar
                    ? { borderRadius: [5, 5, 1, 1] }
                    : { borderWidth: 2, borderColor: token("--card") },
                  emphasis: { focus: "series" },
                  ...(index === 0 && Number.isFinite(baseline)
                    ? {
                        markLine: {
                          silent: true,
                          symbol: "none",
                          label: {
                            formatter: "Inicio",
                            color: muted,
                            fontFamily,
                            fontSize: 11,
                            position: "insideEndTop",
                          },
                          lineStyle: { color: muted, type: "dashed" },
                          data: [{ yAxis: baseline }],
                        },
                      }
                    : {}),
                };
              }),
            },
            { notMerge: true },
          );
          setReady(true);
        };

        try {
          render();
        } catch {
          setError(true);
        }

        const resizeObserver = new ResizeObserver(() => chart.resize());
        resizeObserver.observe(node);
        window.addEventListener("gym-theme-change", render);
        motion.addEventListener("change", render);
        cleanup = () => {
          resizeObserver.disconnect();
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
  }, [baseline, context, description, labels, max, min, series, title, unit]);

  return (
    <figure aria-labelledby={descriptionId} className="relative min-w-0">
      <figcaption id={descriptionId} className="sr-only">
        {description}
      </figcaption>
      {!ready && !error ? (
        <div
          className="absolute inset-0 animate-pulse rounded-xl bg-[color:var(--surface-subtle)]"
          aria-label={`Preparando ${title}`}
          role="status"
        />
      ) : null}
      {error ? (
        <div
          className="grid place-items-center rounded-xl border border-dashed border-[color:var(--border)] text-sm text-[color:var(--text-muted)]"
          style={{ height }}
        >
          No pudimos mostrar la gráfica.
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{ height }}
          role="img"
          aria-label={title}
        />
      )}
    </figure>
  );
}

AnalyticsEChart.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  series: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      values: PropTypes.arrayOf(PropTypes.number),
      type: PropTypes.oneOf(["line", "bar"]),
      token: PropTypes.string,
      dashed: PropTypes.bool,
      area: PropTypes.bool,
    }),
  ).isRequired,
  unit: PropTypes.string,
  height: PropTypes.number,
  min: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  max: PropTypes.number,
  baseline: PropTypes.number,
  context: PropTypes.arrayOf(PropTypes.string),
};
