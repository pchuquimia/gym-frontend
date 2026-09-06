import PropTypes from "prop-types";

export default function AuthField({ id, label, error, children }) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block font-sans text-[11px] font-normal uppercase tracking-[0.03em] text-[color:var(--auth-muted)]"
      >
        {label}
      </label>
      <div className="relative">{children}</div>
      {error ? (
        <p id={errorId} className="font-sans text-xs font-medium text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

AuthField.propTypes = {
  id: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
};
