import PropTypes from "prop-types";
import { Menu } from "lucide-react";

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
      className="grid h-10 w-10 shrink-0 place-items-center text-[#1a1a1a] transition-colors hover:text-[#ff5722] dark:text-[#d8d8c0] dark:hover:text-[#e2ff00] md:hidden"
      aria-label="Abrir menu principal"
      title="Abrir menu principal"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}

MobileMenuButton.propTypes = {
  onClick: PropTypes.func,
};
