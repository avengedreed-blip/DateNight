import React, { useMemo } from "react";

import { THEMES } from "../../themeConfig";

const toEntries = (themes) => Object.entries(themes ?? {});

const ThemesPanel = ({ themeKey, onThemeChange }) => {
  const themeEntries = useMemo(() => toEntries(THEMES), []);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-white/70">
        Choose a look and feel for Date Night. Switching themes instantly updates
        the wheel, interface accents, and ambient effects.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {themeEntries.map(([key, theme]) => {
          const isActive = key === themeKey;
          const gradientStart = theme?.bg?.[0] ?? "#111111";
          const gradientEnd = theme?.bg?.[1] ?? "#222222";
          const label = theme?.name ?? key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onThemeChange?.(key)}
              className={`group flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] ${
                isActive
                  ? "border-[var(--theme-primary)] shadow-[0_16px_30px_rgba(0,0,0,0.4)]"
                  : "border-white/10 hover:border-white/40"
              }`}
              style={{
                background: `linear-gradient(150deg, ${gradientStart}, ${gradientEnd})`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-white">{label}</span>
                {isActive && (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase text-white">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/80">
                <span className="font-semibold uppercase tracking-[0.3em] text-white/70">
                  Accents
                </span>
                <div className="flex items-center gap-1">
                  {Object.values(theme?.colors ?? {}).slice(0, 3).map((color) => (
                    <span
                      key={color}
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemesPanel;
