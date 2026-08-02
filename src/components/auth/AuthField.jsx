import PropTypes from "prop-types";

export default function AuthField({ id, icon: Icon, label, error, children }) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[11px] font-bold uppercase text-blue-100/75"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-100/45"
          aria-hidden="true"
        />
        {children}
      </div>
      {error ? (
        <p id={errorId} className="text-xs font-semibold text-red-200">
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
