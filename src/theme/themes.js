export const THEMES = [
  {
    id: "classic-dark",
    name: "Classic Dark",
    tokens: {
      "--bg1": "#0b1220",
      "--bg2": "#1a2235",
      "--ring": "#4f46e5",
      "--label-color": "#f8fafc",
      "--truth": "#9f1239",
      "--dare": "#b45309",
      "--trivia": "#0f766e",
      "--shadow-weak": "rgba(8, 12, 24, 0.35)",
    },
  },
  {
    id: "romantic-glow",
    name: "Romantic Glow",
    tokens: {
      "--bg1": "#1a0f1f",
      "--bg2": "#321533",
      "--ring": "#ff7ab8",
      "--label-color": "#ffe5f5",
      "--truth": "#a21caf",
      "--dare": "#c2410c",
      "--trivia": "#6d28d9",
      "--shadow-weak": "rgba(32, 9, 27, 0.32)",
    },
  },
  {
    id: "playful-neon",
    name: "Playful Neon",
    tokens: {
      "--bg1": "#04111d",
      "--bg2": "#092735",
      "--ring": "#1ef2d0",
      "--label-color": "#e7fffb",
      "--truth": "#1d4ed8",
      "--dare": "#be123c",
      "--trivia": "#065f46",
      "--shadow-weak": "rgba(3, 17, 26, 0.38)",
    },
  },
  {
    id: "mystic-night",
    name: "Mystic Night",
    tokens: {
      "--bg1": "#0b1026",
      "--bg2": "#1b2552",
      "--ring": "#7dd3fc",
      "--label-color": "#e2e8f0",
      "--truth": "#9d174d",
      "--dare": "#b45309",
      "--trivia": "#1e3a8a",
      "--shadow-weak": "rgba(8, 14, 40, 0.34)",
    },
  },
];

export const DEFAULT_THEME_ID = "classic-dark";

export const THEME_MAP = THEMES.reduce((acc, theme) => {
  acc.set(theme.id, theme);
  return acc;
}, new Map());
