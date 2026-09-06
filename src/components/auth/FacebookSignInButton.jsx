import PropTypes from "prop-types";

export default function FacebookSignInButton({
  disabled = false,
  href,
  text = "Continuar con Facebook",
}) {
  return (
    <a
      href={disabled ? undefined : href}
      aria-disabled={disabled}
      className={`flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#dadce0] bg-white px-4 font-sans text-sm font-medium text-[#3c4043] transition hover:bg-[#f8f9fa] focus-visible:ring-2 focus-visible:ring-[#1877f2]/30 focus-visible:ring-offset-2 ${
        disabled ? "pointer-events-none opacity-55" : ""
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
        <path
          fill="#1877F2"
          d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.974h-1.513c-1.49 0-1.956.931-1.956 1.887v2.26h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"
        />
        <path
          fill="#fff"
          d="m16.671 15.563.532-3.49h-3.328v-2.26c0-.956.466-1.887 1.956-1.887h1.513V4.952s-1.373-.236-2.686-.236c-2.741 0-4.533 1.671-4.533 4.697v2.66H7.078v3.49h3.047V24a12.11 12.11 0 0 0 3.75 0v-8.437h2.796Z"
        />
      </svg>
      <span>{text}</span>
    </a>
  );
}

FacebookSignInButton.propTypes = {
  disabled: PropTypes.bool,
  href: PropTypes.string.isRequired,
  text: PropTypes.string,
};
