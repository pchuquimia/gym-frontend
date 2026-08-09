import PropTypes from "prop-types";

export default function ChartSampleState({ value, detail }) {
  return (
    <div className="grid h-full place-items-center border border-dashed border-[color:var(--border)] px-4 py-6 text-center">
      <div>
        <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
          Primera observacion
        </p>
        <p className="mt-2 text-3xl font-black">{value}</p>
        {detail ? (
          <p className="mt-1 text-xs font-bold text-[color:var(--text-muted)]">
            {detail}
          </p>
        ) : null}
        <p className="mt-3 text-xs font-semibold text-[color:var(--text-muted)]">
          Registra otra sesion para calcular la tendencia.
        </p>
      </div>
    </div>
  );
}

ChartSampleState.propTypes = {
  value: PropTypes.string.isRequired,
  detail: PropTypes.string,
};
