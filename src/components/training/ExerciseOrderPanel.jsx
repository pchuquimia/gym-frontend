import PropTypes from "prop-types";
import { Reorder } from "framer-motion";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import Button from "../ui/button";

export default function ExerciseOrderPanel({
  exercises,
  historyCount,
  active,
  onToggle,
  onReorder,
  onMove,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[color:var(--text)]">
            Orden de ejecución
          </p>
          <p className="truncate text-[11px] text-[color:var(--text-muted)]">
            {historyCount
              ? `${historyCount} ${historyCount === 1 ? "sesión" : "sesiones"} con secuencias musculares compatibles`
              : "Sin referencias para estas secuencias musculares"}
          </p>
        </div>
        <Button
          type="button"
          variant={active ? "default" : "outline"}
          size="sm"
          className="shrink-0 rounded-xl"
          onClick={onToggle}
        >
          {active ? "Listo" : "Ordenar"}
        </Button>
      </div>

      {active ? (
        <Reorder.Group
          axis="y"
          values={exercises}
          onReorder={onReorder}
          className="space-y-2"
        >
          {exercises.map((exercise, index) => (
            <Reorder.Item
              key={exercise.id}
              value={exercise}
              className="grid w-full max-w-full cursor-grab grid-cols-[20px_36px_minmax(0,1fr)_76px] items-center gap-2 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-sm active:cursor-grabbing"
            >
              <GripVertical className="h-5 w-5 text-[color:var(--text-muted)]" />
              <div className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] text-sm font-semibold text-[color:var(--text)]">
                {index + 1}
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="truncate text-sm font-semibold text-[color:var(--text)]">
                  {exercise.name}
                </p>
                <p className="truncate text-xs text-[color:var(--text-muted)]">
                  {exercise.muscle} · {exercise.sets?.length || 0} series
                </p>
              </div>
              <div className="flex w-[76px] items-center justify-end gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 min-w-9 rounded-full p-0"
                  disabled={index === 0}
                  onClick={() => onMove(exercise.id, -1)}
                  aria-label={`Subir ${exercise.name}`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 min-w-9 rounded-full p-0"
                  disabled={index === exercises.length - 1}
                  onClick={() => onMove(exercise.id, 1)}
                  aria-label={`Bajar ${exercise.name}`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : null}
    </div>
  );
}

ExerciseOrderPanel.propTypes = {
  exercises: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      muscle: PropTypes.string,
      sets: PropTypes.array,
    }),
  ).isRequired,
  historyCount: PropTypes.number.isRequired,
  active: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
};
