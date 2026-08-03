import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "../hooks/useThemeMode";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeMode();
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)] shadow-sm transition-colors hover:border-[#ff5722] active:bg-[color:var(--bg)] dark:hover:border-[#e2ff00]"
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Activar modo claro" : "Activar modo oscuro"}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
