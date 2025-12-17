import PropTypes from 'prop-types'

const formatDelta = (delta) => {
  if (delta === null || Number.isNaN(delta)) return '—'
  const val = Number(delta).toFixed(1)
  return `${delta >= 0 ? '+' : ''}${val}%`
}

const ExerciseComparisonCard = ({
  exercise,
  refData = null,
  delta = null,
  status = 'Sin referencia',
  refCount = 0,
  onViewProgress = null,
  index = 0,
}) => {
  const badgeClass =
    status === 'Mejoró'
      ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
      : status === 'Bajó'
        ? 'bg-rose-500/15 text-rose-200 border border-rose-400/30'
        : status === 'Insuficiente data' || status === 'Sin referencia'
          ? 'bg-white/5 text-muted border border-border-soft'
          : 'bg-amber-500/15 text-amber-200 border border-amber-400/30'

  return (
    <div className="rounded-2xl border border-border-soft bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{exercise.exerciseName}</p>
          <p className="text-xs text-muted">{exercise.muscleGroup}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full ${badgeClass}`}>{status} {formatDelta(delta)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-border-soft/60 bg-bg-darker/40 p-3 space-y-1">
          <p className="text-[11px] text-muted uppercase">Hoy</p>
          <p className="text-sm font-semibold">
            Top set: {exercise.topSet?.weightKg || 0} kg x {exercise.topSet?.reps || 0}
          </p>
          <p className="text-muted">1RM: {exercise.oneRMTop?.toFixed(1)} kg</p>
          <p className="text-muted">Volumen: {Math.round(exercise.volume)} kg·reps</p>
          <p className="text-muted">Sets: {exercise.setsCount} · Reps: {exercise.repsTotal}</p>
        </div>
        <div className="rounded-xl border border-border-soft/60 bg-bg-darker/20 p-3 space-y-1">
          <p className="text-[11px] text-muted uppercase">Promedio últimos {refCount || '—'} (máx 7)</p>
          <p className="text-sm font-semibold">
            1RM: {refData?.oneRMTop ? refData.oneRMTop.toFixed(1) : '—'} kg
          </p>
          <p className="text-muted">
            Volumen: {refData?.volume ? Math.round(refData.volume) : '—'} kg·reps
          </p>
          <p className="text-muted">
            Sets: {refData?.setsCount ? refData.setsCount.toFixed(1) : '—'} · Reps:{' '}
            {refData?.repsTotal ? refData.repsTotal.toFixed(1) : '—'}
          </p>
          {!refCount && <p className="text-muted text-[11px]">Primera vez registrado</p>}
        </div>
      </div>
      <div className="flex justify-end">
        <button className="ghost-btn text-xs" type="button" onClick={() => onViewProgress?.(exercise.exerciseId, index)}>
          Ver progreso
        </button>
      </div>
    </div>
  )
}

ExerciseComparisonCard.propTypes = {
  exercise: PropTypes.object.isRequired,
  refData: PropTypes.object,
  delta: PropTypes.number,
  status: PropTypes.string,
  refCount: PropTypes.number,
  onViewProgress: PropTypes.func,
  index: PropTypes.number,
}

export default ExerciseComparisonCard
