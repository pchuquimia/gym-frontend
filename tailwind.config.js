/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", '"Space Grotesk"', "system-ui", "sans-serif"],
        condensed: [
          '"Barlow Condensed"',
          '"Arial Narrow"',
          "Inter",
          "sans-serif",
        ],
      },
      colors: {
        background: "var(--bg)",
        surface: "var(--surface)",
        "surface-subtle": "var(--surface-subtle)",
        card: "var(--card)",
        border: "var(--border)",
        foreground: "var(--text)",
        muted: "var(--text-muted)",
        accent: "var(--accent)",
        "accent-strong": "var(--accent-strong)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-md)",
        xl: "var(--shadow-overlay)",
        "2xl": "var(--shadow-overlay)",
        hairline: "var(--shadow-xs)",
        soft: "var(--shadow-sm)",
        floating: "var(--shadow-md)",
        overlay: "var(--shadow-overlay)",
        drawer: "var(--shadow-drawer)",
        nav: "var(--shadow-nav)",
      },
      borderRadius: {
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        modal: "var(--radius-modal)",
      },
    },
  },
  plugins: [],
};
