import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "../hooks/useThemeMode";

export default function ThemeToggle({ compact = false }) {
  const { isDark, toggleTheme } = useThemeMode();
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`grid shrink-0 place-items-center border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] shadow-soft transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-subtle)] ${
        compact ? "h-9 w-9 rounded-control" : "h-11 w-11 rounded-full"
      }`}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Activar modo claro" : "Activar modo oscuro"}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
