import AppChart from "./AppChart";
import { dateLabel, number } from "../../utils/progressDashboard";
import {
  alignPlanProgressWeeks,
  type PlanProgressData,
} from "../../utils/planProgressComparison";

interface Props {
  current: PlanProgressData;
  comparison?: PlanProgressData | null;
}

export default function PlanPerformanceChart({ current, comparison }: Props) {
  if (!current.points.length) {
    return (
      <div className="plan-progress-empty">
        <strong>Aún no hay entrenamientos registrados en esta selección.</strong>
        <span>Cuando completes sesiones, aquí aparecerá su evolución.</span>
      </div>
    );
  }

  if (!current.comparisons) {
    return (
      <div className="plan-progress-empty">
        <strong>Ya tienes un punto de partida.</strong>
        <span>Registra otra sesión con los mismos ejercicios para ver cómo cambia tu rendimiento.</span>
      </div>
    );
  }

  if (comparison) {
    const aligned = alignPlanProgressWeeks(current, comparison);
    return (
      <div className="plan-progress-graph">
        <div className="plan-progress-compare-heading">
          <span>Índice de rendimiento</span>
          <div className="plan-progress-legend" aria-label="Planes comparados">
            <span><i className="plan-progress-legend-current" aria-hidden="true" />Actual: {current.plan.name}</span>
            <span><i className="plan-progress-legend-other" aria-hidden="true" />Comparado: {comparison.plan.name}</span>
          </div>
        </div>
        <AppChart
          title={`Comparación de ${current.plan.name} y ${comparison.plan.name}`}
          description="Cada planificación comienza en 100 en su primera semana con registros. Las líneas muestran el cambio relativo de marcas comparables dentro de cada plan."
          labels={aligned.labels}
          series={[
            { name: `Actual: ${current.plan.name}`, values: aligned.current, token: "--success" },
            { name: `Comparado: ${comparison.plan.name}`, values: aligned.comparison, color: "#8b5cf6", dashed: true },
          ]}
          unit="puntos"
          height={330}
          scale
          valueAxisName="Puntos"
          showLegend={false}
          showDescription={false}
          minimal
          connectNulls
        />
        <p className="plan-progress-explanation">
          Cada plan parte de 100 en su primera semana registrada. Las líneas comparan la evolución de marcas compatibles dentro de cada plan; los espacios sin entrenamientos no añaden datos.
        </p>
      </div>
    );
  }

  return (
    <div className="plan-progress-graph">
      <div className="plan-progress-graph-heading">
        <div>
          <span>Índice de rendimiento</span>
          <strong>{number(current.points.at(-1)?.value ?? 100)} <small>puntos</small></strong>
        </div>
        {current.totalChange !== null ? (
          <span className="plan-progress-change">
            {current.totalChange > 0 ? "+" : ""}{number(current.totalChange)}%
            <small> desde la primera sesión</small>
          </span>
        ) : null}
      </div>
      <AppChart
        title={`Rendimiento de ${current.plan.name}`}
        description="El índice comienza en 100. Compara marcas de los mismos ejercicios y configuraciones en sesiones sucesivas."
        labels={current.points.map((point) => dateLabel(point.date))}
        series={[{
          name: "Rendimiento",
          values: current.points.map((point) => point.value),
          token: "--success",
        }]}
        unit="puntos"
        context={current.points.map((point) =>
          point.comparisons
            ? `${point.comparisons} ${point.comparisons === 1 ? "marca comparable" : "marcas comparables"}`
            : "Punto de partida",
        )}
        height={330}
        scale
        valueAxisName="Puntos"
        showLegend={false}
        showDescription={false}
        compactTooltip
        minimal
      />
      <p className="plan-progress-explanation">
        100 es el punto de partida. La línea sube cuando mejoran tus marcas en ejercicios comparables.
      </p>
    </div>
  );
}
