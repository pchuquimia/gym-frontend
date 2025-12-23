import PropTypes from "prop-types";

const formatDelta = (delta) => {
  if (delta === null || Number.isNaN(delta)) return "—";
  const val = Number(delta).toFixed(1);
  return `${delta >= 0 ? "+" : ""}${val}%`;
};

const MuscleGroupSummaryCard = ({
  muscleLabel,
  today = null,
  refData = null,
  delta = null,
  status = "Sin referencia",
  refCount = 0,
}) => {
  const badgeClass =
    status === "Mejoró"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "Bajó"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : status === "Insuficiente data" || status === "Sin referencia"
      ? "bg-slate-50 text-slate-600 border-slate-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight text-slate-900">
            {muscleLabel}
          </p>
          <p className="text-sm text-slate-500">
            Ref: {refCount ? `${refCount} entrenamientos` : "—"}
          </p>
        </div>

        {/* Badge delta (como la imagen) */}
        <span
          className={`
          inline-flex items-center
          rounded-lg
          px-2.5 py-1
          text-sm font-semibold
          border
          ${badgeClass}
        `}
        >
          {formatDelta(delta)}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1 */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            ÍNDICE FUERZA
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {today?.strengthIndex ? today.strengthIndex.toFixed(1) : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Avg 7:{" "}
            {refData?.strengthIndex ? refData.strengthIndex.toFixed(1) : "—"}
          </p>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            VOLUMEN
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {Math.round(today?.volume || 0)}
            <span className="ml-1 text-sm font-medium text-slate-500">
              kg·reps
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Avg 7: {refData?.volume ? Math.round(refData.volume) : "—"}
          </p>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            SETS
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {today?.setsCount || 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Avg 7: {refData?.setsCount ? refData.setsCount.toFixed(1) : "—"}
          </p>
        </div>

        {/* Card 4 */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            MEJOR 1RM
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {today?.bestOneRM ? today.bestOneRM.toFixed(1) : "—"}
            <span className="ml-1 text-sm font-medium text-slate-500">kg</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Avg 7: {refData?.bestOneRM ? refData.bestOneRM.toFixed(1) : "—"} kg
          </p>
        </div>
      </div>
    </div>
  );
};

MuscleGroupSummaryCard.propTypes = {
  muscleLabel: PropTypes.string.isRequired,
  today: PropTypes.object,
  refData: PropTypes.object,
  delta: PropTypes.number,
  status: PropTypes.string,
  refCount: PropTypes.number,
};

export default MuscleGroupSummaryCard;
