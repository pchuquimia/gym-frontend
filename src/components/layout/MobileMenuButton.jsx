import PropTypes from "prop-types";

export default function MobileMenuButton({ onClick }) {
  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    window.dispatchEvent(new Event("open-main-menu"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[0.75rem] border border-[color:var(--border)] bg-[color:var(--surface)]/92 text-[color:var(--text)] shadow-soft backdrop-blur-xl transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-px hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-raised)] hover:shadow-floating active:translate-y-0 active:scale-[0.97] md:hidden"
      aria-label="Abrir menu principal"
      title="Abrir menu principal"
    >
      <span
        className="pointer-events-none absolute left-0 top-2.5 h-4 w-0.5 rounded-full bg-[color:var(--accent)] opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
      <span className="flex w-[19px] flex-col gap-[5px]" aria-hidden="true">
        <span className="h-[1.5px] w-full rounded-full bg-current transition-transform duration-200 group-hover:translate-x-0.5" />
        <span className="ml-auto h-[1.5px] w-[13px] rounded-full bg-current transition-[width] duration-200 group-hover:w-full" />
      </span>
    </button>
  );
}

MobileMenuButton.propTypes = {
  onClick: PropTypes.func,
};
