import { useCallback, useEffect, useState } from "react";

const storageKey = "theme";
const themeChangeEvent = "gym-theme-change";

const getCurrentTheme = () => {
  if (typeof document === "undefined") return "light";
  const stored = localStorage.getItem(storageKey);
  if (stored === "dark" || stored === "light") return stored;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
};

const applyTheme = (theme) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.dataset.theme = theme;
  localStorage.setItem(storageKey, theme);
  window.dispatchEvent(new CustomEvent(themeChangeEvent, { detail: theme }));
};

export function useThemeMode() {
  const [theme, setThemeState] = useState(getCurrentTheme);

  useEffect(() => {
    applyTheme(getCurrentTheme());
    const syncTheme = (event) => {
      setThemeState(event.detail || getCurrentTheme());
    };
    window.addEventListener(themeChangeEvent, syncTheme);
    return () => window.removeEventListener(themeChangeEvent, syncTheme);
  }, []);

  const setTheme = useCallback((nextTheme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }, [setTheme]);

  return { theme, isDark: theme === "dark", setTheme, toggleTheme };
}
