import PropTypes from "prop-types";

export default function AuthField({ id, icon: Icon, label, error, children }) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--auth-muted)]"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--auth-muted)]"
          aria-hidden="true"
        />
        {children}
      </div>
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
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
};
