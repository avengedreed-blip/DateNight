import { THEMES as THEME_DEFINITIONS } from "./theme/themes";

const RAW_THEMES = THEME_DEFINITIONS.reduce((acc, theme) => {
  acc[theme.id] = {
    name: theme.name,
    bg: theme.bg,
    colors: {
      truth: theme.colors.truth,
      dare: theme.colors.dare,
      trivia: theme.colors.trivia,
      consequence: theme.colors.consequence,
    },
    label: theme.label,
    particles: theme.particles,
    meter: theme.meter,
  };
  return acc;
}, {});

export const THEMES = RAW_THEMES;

export function getLuminance(hexColor) {
  if (!hexColor) return 0;
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(hex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const srgb = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export default THEMES;
