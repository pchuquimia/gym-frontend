import { useEffect, useState } from "react";

const storageKey = "theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.dataset.theme = theme;
    localStorage.setItem(storageKey, theme);
  }, [theme]);

  const toggle = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1 text-sm font-semibold text-[color:var(--text)] shadow-sm hover:border-blue-200 transition-colors"
      aria-label="Cambiar tema"
    >
      <span
        className="h-4 w-4 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 shadow-inner"
        aria-hidden
      />
      {theme === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
