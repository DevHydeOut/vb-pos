"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme:     Theme;
  toggleTheme: () => void;
}>({
  theme:       "light",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const system  = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark" : "light";
    const initial = stored ?? system;
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.dataset.theme = next;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
