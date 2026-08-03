import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "../hooks/useThemeMode";

export default function ThemeToggle({ compact = false }) {
  const { isDark, toggleTheme } = useThemeMode();
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`grid shrink-0 place-items-center border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)] transition-colors hover:border-[#ff5722] active:bg-[color:var(--bg)] dark:hover:border-[#e2ff00] ${
        compact ? "h-9 w-9 rounded-xl" : "h-10 w-10 rounded-full shadow-sm"
      }`}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Activar modo claro" : "Activar modo oscuro"}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
