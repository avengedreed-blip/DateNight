const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const parseHex = (hex) => {
  if (!hex) {
    return null;
  }

  const normalized = hex.replace(/[^0-9a-f]/gi, "").slice(0, 6);
  if (!normalized) {
    return null;
  }

  const padded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized.padEnd(6, normalized[normalized.length - 1]);

  const value = Number.parseInt(padded, 16);
  if (Number.isNaN(value)) {
    return null;
  }

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const toHexComponent = (value) =>
  clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");

const mixColor = (hex, withHex, amount) => {
  const primary = parseHex(hex);
  const secondary = parseHex(withHex);
  const weight = clamp(amount, 0, 1);

  if (!primary || !secondary) {
    return hex ?? withHex ?? "#ffffff";
  }

  const r = primary.r + (secondary.r - primary.r) * weight;
  const g = primary.g + (secondary.g - primary.g) * weight;
  const b = primary.b + (secondary.b - primary.b) * weight;

  return `#${toHexComponent(r)}${toHexComponent(g)}${toHexComponent(b)}`;
};

const toRgba = (hex, alpha = 1) => {
  const parsed = parseHex(hex);
  const safeAlpha = clamp(alpha, 0, 1);

  if (!parsed) {
    return `rgba(15, 23, 42, ${safeAlpha})`;
  }

  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${safeAlpha})`;
};

const accentHighlight = (accent, fallback = "#ffffff") =>
  toRgba(mixColor(accent, fallback, 0.5), 0.28);

const accentGlow = (accent, fallback = "#ffffff") =>
  toRgba(mixColor(accent, fallback, 0.2), 0.18);

const relativeLuminance = (hex) => {
  const parsed = parseHex(hex);
  if (!parsed) {
    return 0;
  }

  const normalizeChannel = (channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const r = normalizeChannel(parsed.r);
  const g = normalizeChannel(parsed.g);
  const b = normalizeChannel(parsed.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const getReadableLabelColor = (
  hex,
  { light = "#f8fafc", dark = "#111827" } = {}
) => {
  const luminance = relativeLuminance(hex);
  if (luminance === 0) {
    return light;
  }

  return luminance > 0.6 ? dark : light;
};

const enhanceThemeCssVars = (cssVars = {}) => {
  const truth = cssVars["--wheel-truth"];
  const dare = cssVars["--wheel-dare"];
  const trivia = cssVars["--wheel-trivia"];
  const lightBase =
    cssVars["--wheel-label-light"] ||
    cssVars["--wheel-label-default"] ||
    "#f8fafc";
  const darkBase = cssVars["--wheel-label-color"] || "#111827";
  const defaultContrast =
    cssVars["--wheel-label-default"] ||
    getReadableLabelColor(cssVars["--primary-accent"], {
      light: lightBase,
      dark: darkBase,
    });

  return {
    ...cssVars,
    "--wheel-label-light": lightBase,
    "--wheel-label-dark": darkBase,
    "--wheel-label-default": defaultContrast,
    "--wheel-truth-label":
      cssVars["--wheel-truth-label"] ||
      getReadableLabelColor(truth, { light: lightBase, dark: darkBase }),
    "--wheel-dare-label":
      cssVars["--wheel-dare-label"] ||
      getReadableLabelColor(dare, { light: lightBase, dark: darkBase }),
    "--wheel-trivia-label":
      cssVars["--wheel-trivia-label"] ||
      getReadableLabelColor(trivia, { light: lightBase, dark: darkBase }),
  };
};

export const DEFAULT_THEME_ID = "classicDark";

export const CUSTOM_THEME_STORAGE_KEY = "dateNightCustomThemes";

export const ACTIVE_THEME_STORAGE_KEY = "dateNightActiveTheme";

const createBaseTheme = ({ id, name, trackId, cssVars }) => ({
  id,
  name,
  trackId,
  cssVars,
  isBaseTheme: true,
});

const RAW_BASE_THEMES = [
  createBaseTheme({
    id: DEFAULT_THEME_ID,
    name: "Classic Dark",
    trackId: "classicDarkTrack",
    cssVars: {
      "--background-gradient":
        "radial-gradient(circle at 20% 20%, #1e293b 0%, #0f172a 55%, #020617 100%)",
      "--bg-main": "#0f172a",
      "--bg-surface": "rgba(15, 23, 42, 0.88)",
      "--bg-panel": "rgba(30, 41, 59, 0.94)",
      "--primary-accent": "#8b5cf6",
      "--primary-accent-strong": "#7c3aed",
      "--secondary-accent": "#38bdf8",
      "--danger": "#f472b6",
      "--warning": "#facc15",
      "--text-main": "#f8fafc",
      "--text-muted": "#cbd5f5",
      "--border-color": "rgba(148, 163, 184, 0.35)",
      "--panel-highlight":
        "linear-gradient(120deg, rgba(139, 92, 246, 0.32), rgba(56, 189, 248, 0.16))",
      "--wheel-truth": "#38bdf8",
      "--wheel-dare": "#a855f7",
      "--wheel-trivia": "#f472b6",
      "--wheel-label-color": "#0f172a",
      "--wheel-truth-label": "#082338",
      "--wheel-dare-label": "#23072f",
      "--wheel-trivia-label": "#3b021e",
    },
  }),
  createBaseTheme({
    id: "romanticGlow",
    name: "Romantic Glow",
    trackId: "romanticGlowTrack",
    cssVars: {
      "--background-gradient":
        "radial-gradient(circle at 15% 15%, #ff9aa2 0%, #ffb7b2 40%, #ffdac1 75%, #f7786b 100%)",
      "--bg-main": "#40202c",
      "--bg-surface": "rgba(64, 32, 44, 0.9)",
      "--bg-panel": "rgba(74, 28, 42, 0.92)",
      "--primary-accent": "#ff7a8a",
      "--primary-accent-strong": "#ff5470",
      "--secondary-accent": "#ffb347",
      "--danger": "#ff5f8f",
      "--warning": "#ffd166",
      "--text-main": "#fff7f9",
      "--text-muted": "#ffd0dc",
      "--border-color": "rgba(255, 164, 190, 0.38)",
      "--panel-highlight":
        "linear-gradient(120deg, rgba(255, 118, 140, 0.35), rgba(255, 179, 71, 0.18))",
      "--wheel-truth": "#ffb347",
      "--wheel-dare": "#ff6f91",
      "--wheel-trivia": "#ffd3b6",
      "--wheel-label-color": "#40121e",
      "--wheel-truth-label": "#37110d",
      "--wheel-dare-label": "#3f071a",
      "--wheel-trivia-label": "#341118",
    },
  }),
  createBaseTheme({
    id: "playfulNeon",
    name: "Playful Neon",
    trackId: "playfulNeonTrack",
    cssVars: {
      "--background-gradient":
        "linear-gradient(135deg, #00f5ff 0%, #ff00d4 55%, #7b5bff 100%)",
      "--bg-main": "#130628",
      "--bg-surface": "rgba(19, 6, 40, 0.9)",
      "--bg-panel": "rgba(31, 17, 62, 0.92)",
      "--primary-accent": "#ff00d4",
      "--primary-accent-strong": "#f000c0",
      "--secondary-accent": "#00f5ff",
      "--danger": "#ff4d6d",
      "--warning": "#ffd166",
      "--text-main": "#fdfcff",
      "--text-muted": "#d7ccff",
      "--border-color": "rgba(123, 91, 255, 0.42)",
      "--panel-highlight":
        "linear-gradient(120deg, rgba(0, 245, 255, 0.32), rgba(255, 0, 212, 0.22))",
      "--wheel-truth": "#00f5ff",
      "--wheel-dare": "#ff00d4",
      "--wheel-trivia": "#ffe066",
      "--wheel-label-color": "#0a0414",
      "--wheel-truth-label": "#071a21",
      "--wheel-dare-label": "#25011f",
      "--wheel-trivia-label": "#2d1a00",
    },
  }),
  createBaseTheme({
    id: "mysticNight",
    name: "Mystic Night",
    trackId: "mysticNightTrack",
    cssVars: {
      "--background-gradient":
        "radial-gradient(circle at 30% 20%, #6b21a8 0%, #1e1b4b 55%, #0b1020 100%)",
      "--bg-main": "#0b1020",
      "--bg-surface": "rgba(15, 18, 33, 0.92)",
      "--bg-panel": "rgba(24, 20, 46, 0.94)",
      "--primary-accent": "#8b5cf6",
      "--primary-accent-strong": "#7c3aed",
      "--secondary-accent": "#60a5fa",
      "--danger": "#f472b6",
      "--warning": "#facc15",
      "--text-main": "#f5f3ff",
      "--text-muted": "#d8d6ff",
      "--border-color": "rgba(120, 101, 201, 0.38)",
      "--panel-highlight":
        "linear-gradient(120deg, rgba(139, 92, 246, 0.32), rgba(96, 165, 250, 0.18))",
      "--wheel-truth": "#60a5fa",
      "--wheel-dare": "#8b5cf6",
      "--wheel-trivia": "#fbbf24",
      "--wheel-label-color": "#160f2d",
      "--wheel-truth-label": "#0c1a34",
      "--wheel-dare-label": "#160c2c",
      "--wheel-trivia-label": "#35200a",
    },
  }),
];

export const BASE_THEMES = RAW_BASE_THEMES.map((theme) => ({
  ...theme,
  cssVars: enhanceThemeCssVars(theme.cssVars),
}));

export const deserializeCustomThemes = (value) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((theme) => theme && typeof theme === "object")
      .map((theme) => ({
        ...theme,
        id: theme.id ?? `custom-${Math.random().toString(36).slice(2)}`,
        name: theme.name ?? "Custom Theme",
        trackId: theme.trackId ?? "customTrack",
        cssVars: theme.cssVars ?? {},
        isBaseTheme: false,
      }));
  } catch (error) {
    console.warn("Failed to parse custom themes", error);
    return [];
  }
};

export const serializeCustomThemes = (themes) => {
  try {
    return JSON.stringify(
      (themes ?? []).map((theme) => ({
        id: theme.id,
        name: theme.name,
        trackId: theme.trackId,
        cssVars: theme.cssVars,
      }))
    );
  } catch (error) {
    console.warn("Failed to serialize custom themes", error);
    return "[]";
  }
};

export const getAvailableThemes = (customThemes = []) => [
  ...BASE_THEMES,
  ...(customThemes ?? []).map((theme) => ({ ...theme, isBaseTheme: false })),
];

const ensureCustomThemeId = (idCandidate) =>
  idCandidate && typeof idCandidate === "string"
    ? idCandidate
    : `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const createCustomTheme = ({
  id,
  name,
  trackId,
  backgroundStyle,
  backgroundPrimary,
  backgroundSecondary,
  accentColor,
  wheelTruthColor,
  wheelDareColor,
  wheelTriviaColor,
  wheelLabelColor,
}) => {
  const safePrimary = backgroundPrimary || "#111827";
  const safeSecondary = backgroundSecondary || safePrimary;
  const safeAccent = accentColor || "#8b5cf6";
  const safeTrackId = trackId?.trim() || "customTrack";
  const safeName = name?.trim() || "Custom Theme";
  const gradient =
    backgroundStyle?.trim() ||
    `linear-gradient(135deg, ${safePrimary} 0%, ${safeSecondary} 100%)`;
  const labelColor = wheelLabelColor || "#0f172a";

  const accentBright = mixColor(safeAccent, "#ffffff", 0.3);
  const accentSoft = mixColor(safeAccent, "#ffffff", 0.55);
  const truthColor = wheelTruthColor || mixColor(safeAccent, "#66f", 0.35);
  const dareColor = wheelDareColor || safeAccent;
  const triviaColor = wheelTriviaColor || mixColor(safeAccent, "#ffcc33", 0.45);

  const cssVars = enhanceThemeCssVars({
    "--background-gradient": gradient,
    "--bg-main": safePrimary,
    "--bg-surface": toRgba(safePrimary, 0.9),
    "--bg-panel": toRgba(safeSecondary, 0.92),
    "--primary-accent": safeAccent,
    "--primary-accent-strong": mixColor(safeAccent, "#2d0b5f", 0.35),
    "--secondary-accent": accentBright,
    "--danger": mixColor(safeAccent, "#ff1f71", 0.5),
    "--warning": mixColor(safeAccent, "#ffd166", 0.5),
    "--text-main": "#fffefc",
    "--text-muted": accentSoft,
    "--border-color": toRgba(accentBright, 0.38),
    "--panel-highlight": `linear-gradient(120deg, ${accentHighlight(
      safeAccent
    )}, ${accentGlow(truthColor)})`,
    "--wheel-truth": truthColor,
    "--wheel-dare": dareColor,
    "--wheel-trivia": triviaColor,
    "--wheel-label-color": labelColor,
  });

  return {
    id: ensureCustomThemeId(id),
    name: safeName,
    trackId: safeTrackId,
    cssVars,
  };
};

export const findThemeById = (themes, id) =>
  (themes ?? []).find((theme) => theme.id === id) ?? BASE_THEMES[0];
