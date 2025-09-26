const BASE_THEME_DEFINITIONS = [
  {
    id: "classic-dark",
    name: "Classic Dark",
    background: ["#0B0F14", "#0E1320"],
    colors: {
      truth: "#00E6D0",
      dare: "#FF477E",
      trivia: "#7AA2FF",
      consequence: "#FFD166",
    },
    label: "white",
    particles: { type: "fireflies", color: "#FFD166" },
    meterGradient: ["#00E6D0", "#FF477E"],
    meterBackground: "#1A1A1A",
    ring: "#00E6D0",
    ringStrong: "#FF477E",
    ringFaint: "#7AA2FF",
    shadowWeak: "rgba(0, 0, 0, 0.45)",
  },
  {
    id: "romantic-glow",
    name: "Romantic Glow",
    background: ["#2E0B24", "#3E1032"],
    colors: {
      truth: "#FF8FAB",
      dare: "#FF477E",
      trivia: "#FFD6E0",
      consequence: "#FFC0CB",
    },
    label: "white",
    particles: { type: "hearts", color: "rgba(255,192,203,.65)" },
    meterGradient: ["#FF8FAB", "#FF477E"],
    meterBackground: "#3E1032",
    ring: "#FF8FAB",
    ringStrong: "#FF477E",
    ringFaint: "#FFD6E0",
    shadowWeak: "rgba(73, 8, 40, 0.55)",
  },
  {
    id: "playful-neon",
    name: "Playful Neon",
    background: ["#101820", "#152032"],
    colors: {
      truth: "#39FF14",
      dare: "#FF073A",
      trivia: "#1E90FF",
      consequence: "#FFD700",
    },
    label: "white",
    particles: { type: "neon-dots", color: "#39FF14" },
    meterGradient: ["#39FF14", "#FF073A"],
    meterBackground: "#152032",
    ring: "#39FF14",
    ringStrong: "#FF073A",
    ringFaint: "#1E90FF",
    shadowWeak: "rgba(6, 12, 20, 0.55)",
  },
  {
    id: "mystic-night",
    name: "Mystic Night",
    background: ["#0A0F1F", "#1B2740"],
    colors: {
      truth: "#5BC0BE",
      dare: "#9D4EDD",
      trivia: "#4CC9F0",
      consequence: "#FFB703",
    },
    label: "white",
    particles: { type: "aurora", color: "rgba(76,201,240,.33)" },
    meterGradient: ["#5BC0BE", "#9D4EDD"],
    meterBackground: "#1B2740",
    ring: "#5BC0BE",
    ringStrong: "#9D4EDD",
    ringFaint: "#4CC9F0",
    shadowWeak: "rgba(5, 12, 26, 0.55)",
  },
];

const LABEL_COLOR_MAP = {
  white: "#FFFFFF",
};

const DEFAULT_LABEL_COLOR = "#FFFFFF";

const toTokens = (theme) => {
  const labelColor = LABEL_COLOR_MAP[theme.label] ?? DEFAULT_LABEL_COLOR;
  return {
    "--bg1": theme.background[0],
    "--bg2": theme.background[1],
    "--bg-gradient-start": theme.background[0],
    "--bg-gradient-end": theme.background[1],
    "--label-color": labelColor,
    "--ring-color": labelColor,
    "--ring": theme.ring,
    "--ring-strong": theme.ringStrong,
    "--ring-faint": theme.ringFaint,
    "--shadow-weak": theme.shadowWeak,
    "--truth-color": theme.colors.truth,
    "--dare-color": theme.colors.dare,
    "--trivia-color": theme.colors.trivia,
    "--consequence-color": theme.colors.consequence,
    "--particle-color": theme.particles.color,
    "--meter-bg": theme.meterBackground,
    "--meter-start": theme.meterGradient[0],
    "--meter-end": theme.meterGradient[1],
  };
};

export const THEMES = BASE_THEME_DEFINITIONS.map((theme) => ({
  id: theme.id,
  name: theme.name,
  bg: theme.background,
  colors: theme.colors,
  label: theme.label,
  particles: theme.particles,
  meter: theme.meterGradient,
  meterBg: theme.meterBackground,
  tokens: toTokens(theme),
}));

export const THEME_MAP = new Map(THEMES.map((theme) => [theme.id, theme]));

export const DEFAULT_THEME_ID = "classic-dark";

const legacyThemes = THEMES.reduce((acc, theme) => {
  acc[theme.id] = {
    bg: theme.bg,
    colors: [
      theme.colors.truth,
      theme.colors.dare,
      theme.colors.trivia,
      theme.colors.consequence,
    ],
    labels: theme.label,
    particles: theme.particles,
    meterBg: theme.meterBg,
  };
  return acc;
}, {});

export default legacyThemes;
