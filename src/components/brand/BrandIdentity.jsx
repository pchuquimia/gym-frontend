import PropTypes from "prop-types";

export function BrandMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 17V11H8.25V17H5Z" fill="currentColor" />
      <path d="M10.375 17V7.5H13.625V17H10.375Z" fill="currentColor" />
      <path d="M15.75 17V4H19V17H15.75Z" fill="currentColor" />
      <path
        d="M4 20H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

BrandMark.propTypes = {
  className: PropTypes.string,
};

export function BrandWordmark({
  className = "",
  accentClassName = "text-[#dcf900]",
}) {
  return (
    <span
      aria-label="RIRFIT"
      className={`inline-flex font-black uppercase tracking-[-0.055em] ${className}`}
    >
      <span aria-hidden="true">RIR</span>
      <span aria-hidden="true" className={accentClassName}>
        FIT
      </span>
    </span>
  );
}

BrandWordmark.propTypes = {
  className: PropTypes.string,
  accentClassName: PropTypes.string,
};
