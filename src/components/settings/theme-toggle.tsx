"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Appearance
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Choose your preferred color scheme
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setTheme("light")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${
            theme === "light"
              ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <Sun className="h-4 w-4" />
          Light
        </button>

        <button
          onClick={() => setTheme("dark")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${
            theme === "dark"
              ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <Moon className="h-4 w-4" />
          Dark
        </button>
      </div>
    </div>
  );
}
