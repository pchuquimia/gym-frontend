import { useCallback, useEffect, useState } from "react";

const storageKey = "theme";
const themeChangeEvent = "gym-theme-change";
const systemThemeColors = {
  light: "#faf8f1",
  dark: "#090909",
};

const syncSystemChrome = (theme) => {
  const themeColor = systemThemeColors[theme] || systemThemeColors.light;
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const appleStatusBarMeta = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  );

  themeMeta?.setAttribute("content", themeColor);
  appleStatusBarMeta?.setAttribute(
    "content",
    theme === "dark" ? "black-translucent" : "default",
  );
  root.style.backgroundColor = themeColor;
  if (document.body) document.body.style.backgroundColor = themeColor;
};

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
  syncSystemChrome(theme);
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
