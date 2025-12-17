import PropTypes from 'prop-types'

const formatDelta = (delta) => {
  if (delta === null || Number.isNaN(delta)) return '—'
  const val = Number(delta).toFixed(1)
  return `${delta >= 0 ? '+' : ''}${val}%`
}

const MuscleGroupSummaryCard = ({
  muscleLabel,
  today = null,
  refData = null,
  delta = null,
  status = 'Sin referencia',
  refCount = 0,
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
          <p className="text-sm font-semibold">{muscleLabel}</p>
          <p className="text-xs text-muted">Referencia: {refCount ? `${refCount} entrenamientos` : '—'}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full ${badgeClass}`}>{status} {formatDelta(delta)}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-border-soft/60 bg-bg-darker/40 p-3">
          <p className="text-muted">Índice fuerza</p>
          <p className="text-base font-semibold">{today?.strengthIndex ? today.strengthIndex.toFixed(1) : '—'}</p>
          <p className="text-[11px] text-muted">Avg 7: {refData?.strengthIndex ? refData.strengthIndex.toFixed(1) : '—'}</p>
        </div>
        <div className="rounded-xl border border-border-soft/60 bg-bg-darker/40 p-3">
          <p className="text-muted">Volumen</p>
          <p className="text-base font-semibold">{Math.round(today?.volume || 0)} kg·reps</p>
          <p className="text-[11px] text-muted">Avg 7: {refData?.volume ? Math.round(refData.volume) : '—'}</p>
        </div>
        <div className="rounded-xl border border-border-soft/60 bg-bg-darker/40 p-3">
          <p className="text-muted">Sets</p>
          <p className="text-base font-semibold">{today?.setsCount || 0}</p>
          <p className="text-[11px] text-muted">Avg 7: {refData?.setsCount ? refData.setsCount.toFixed(1) : '—'}</p>
        </div>
        <div className="rounded-xl border border-border-soft/60 bg-bg-darker/40 p-3">
          <p className="text-muted">Mejor 1RM</p>
          <p className="text-base font-semibold">{today?.bestOneRM ? today.bestOneRM.toFixed(1) : '—'} kg</p>
          <p className="text-[11px] text-muted">Avg 7: {refData?.bestOneRM ? refData.bestOneRM.toFixed(1) : '—'} kg</p>
        </div>
      </div>
    </div>
  )
}

MuscleGroupSummaryCard.propTypes = {
  muscleLabel: PropTypes.string.isRequired,
  today: PropTypes.object,
  refData: PropTypes.object,
  delta: PropTypes.number,
  status: PropTypes.string,
  refCount: PropTypes.number,
}

export default MuscleGroupSummaryCard
