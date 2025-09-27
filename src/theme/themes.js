// --- POLISHED: Refined color palettes for a more premium, modern, and cohesive feel ---
const BASE_THEME_DEFINITIONS = [
  {
    id: "classic-dark",
    name: "Classic Dark",
    background: ["#0D121B", "#0A0E14"], // Deeper, richer navy-black gradient
    colors: {
      truth: "#00E6D0",
      dare: "#FF477E",
      trivia: "#7AA2FF",
      consequence: "#FFD166",
    },
    label: "white",
    particles: { type: "fireflies", color: "#FFD166" },
    meterGradient: ["#00E6D0", "#7AA2FF"], // Smoother transition
    meterBackground: "rgba(26, 26, 26, 0.7)",
    ring: "#00E6D0",
    ringStrong: "#FF477E",
    ringFaint: "rgba(122, 162, 255, 0.7)",
    shadowWeak: "rgba(0, 0, 0, 0.5)",
    // --- NEW: Added tokens for advanced polish ---
    glow: "rgba(0, 230, 208, 0.65)", // Based on --truth
    shadowStrong: "rgba(0, 0, 0, 0.7)",
    bgOverlay: "rgba(18, 24, 36, 0.6)", // For glassmorphism
  },
  {
    id: "romantic-glow",
    name: "Romantic Glow",
    background: ["#3E1032", "#24091C"], // Deeper plum-to-magenta gradient
    colors: {
      truth: "#FF8FAB",
      dare: "#FF477E",
      trivia: "#FFB3C1", // Slightly more saturated for better visibility
      consequence: "#FFC0CB",
    },
    label: "white",
    particles: { type: "hearts", color: "rgba(255, 192, 203, 0.65)" },
    meterGradient: ["#FF8FAB", "#FF477E"],
    meterBackground: "rgba(62, 16, 50, 0.7)",
    ring: "#FF8FAB",
    ringStrong: "#FF477E",
    ringFaint: "rgba(255, 214, 224, 0.7)",
    shadowWeak: "rgba(73, 8, 40, 0.55)",
    // --- NEW: Added tokens for advanced polish ---
    glow: "rgba(255, 71, 126, 0.7)", // Based on --dare
    shadowStrong: "rgba(73, 8, 40, 0.75)",
    bgOverlay: "rgba(62, 16, 50, 0.6)", // For glassmorphism
  },
  {
    id: "playful-neon",
    name: "Playful Neon",
    background: ["#1A1128", "#0C0714"], // Darker, deeper purple background for contrast
    colors: {
      truth: "#39FF14",
      dare: "#FF00FF", // Changed to Magenta for a true neon feel
      trivia: "#00BFFF", // Deep Sky Blue, pops better
      consequence: "#FFFF00", // Brighter Yellow
    },
    label: "white",
    particles: { type: "neon-dots", color: "#39FF14" },
    meterGradient: ["#39FF14", "#00BFFF"],
    meterBackground: "rgba(21, 32, 50, 0.7)",
    ring: "#39FF14",
    ringStrong: "#FF00FF",
    ringFaint: "rgba(30, 144, 255, 0.7)",
    shadowWeak: "rgba(6, 12, 20, 0.55)",
    // --- NEW: Added tokens for advanced polish ---
    glow: "rgba(57, 255, 20, 0.6)", // Based on --truth
    shadowStrong: "rgba(6, 12, 20, 0.75)",
    bgOverlay: "rgba(26, 17, 40, 0.6)", // For glassmorphism
  },
  {
    id: "mystic-night",
    name: "Mystic Night",
    background: ["#1B2740", "#0A0F1F"], // Smoother, ethereal space-blue gradient
    colors: {
      truth: "#5BC0BE",
      dare: "#9D4EDD",
      trivia: "#4CC9F0",
      consequence: "#FFB703",
    },
    label: "white",
    particles: { type: "aurora", color: "rgba(76, 201, 240, 0.33)" },
    meterGradient: ["#5BC0BE", "#4CC9F0"],
    meterBackground: "rgba(27, 39, 64, 0.7)",
    ring: "#5BC0BE",
    ringStrong: "#9D4EDD",
    ringFaint: "rgba(76, 201, 240, 0.7)",
    shadowWeak: "rgba(5, 12, 26, 0.6)",
    // --- NEW: Added tokens for advanced polish ---
    glow: "rgba(157, 78, 221, 0.65)", // Based on --dare
    shadowStrong: "rgba(5, 12, 26, 0.8)",
    bgOverlay: "rgba(27, 39, 64, 0.6)", // For glassmorphism
  },
];

const LABEL_COLOR_MAP = {
  white: "#FFFFFF",
};

const DEFAULT_LABEL_COLOR = "#FFFFFF";

const toTokens = (theme) => {
  const labelColor = LABEL_COLOR_MAP[theme.label] ?? DEFAULT_LABEL_COLOR;
  return {
    // --- Existing Tokens (Unchanged) ---
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
    // --- NEW: Added backward-compatible tokens for polish ---
    "--glow-color": theme.glow,
    "--shadow-strong": theme.shadowStrong,
    "--bg-overlay": theme.bgOverlay,
  };
};

// --- No changes needed below this line ---

export const THEMES = BASE_THEME_DEFINITIONS.map((theme) => ({
  id: theme.id,
  name: theme.name,
  bg: theme.background,
  colors: theme.colors,
  label: theme.label,
  particles: theme.particles,
  meter: theme.meterGradient,
  meterBg: theme.meterBackground,
  // Add new keys here for direct access if needed
  glow: theme.glow,
  shadowStrong: theme.shadowStrong,
  bgOverlay: theme.bgOverlay,
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
