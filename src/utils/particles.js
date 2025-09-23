const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const PARTICLE_MAP = {
  truth: {
    normal: { icons: ["\uD83D\uDCA1"], range: [6, 8] },
    spicy: { icons: ["\uD83D\uDC8B"], range: [10, 12] },
    extreme: { icons: ["\u2764\uFE0F\u200D\uD83D\uDD25"], range: [14, 16] },
  },
  dare: {
    normal: { icons: ["\u2B50"], range: [6, 8] },
    spicy: { icons: ["\uD83D\uDD25"], range: [10, 12] },
    extreme: { icons: ["\uD83D\uDD17"], range: [14, 16] },
  },
  trivia: {
    normal: { icons: ["\u2753", "\u2757"], range: [6, 8] },
  },
  consequence: {
    normal: { icons: ["\u2601\uFE0F"], range: [6, 8] },
    spicy: { icons: ["\uD83D\uDE08"], range: [10, 12] },
    extreme: { icons: ["\uD83D\uDC80"], range: [14, 16] },
  },
};

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const createParticleBurst = (category, intensity = "normal") => {
  const map = PARTICLE_MAP[category];
  if (!map) {
    return [];
  }

  const config = map[intensity] ?? map.normal;
  if (!config) {
    return [];
  }

  const { icons, range } = config;
  const [min, max] = range;
  const count = randomBetween(min, max);

  const particles = Array.from({ length: count }, (_, index) => {
    const icon = icons[index % icons.length];
    const angle = Math.random() * Math.PI * 2;
    const distance = randomBetween(24, 42);
    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;
    const scale = clamp(0.75 + Math.random() * 0.65, 0.75, 1.4);
    const rotate = (Math.random() - 0.5) * 40;
    const duration = randomBetween(900, 1400);
    const delay = Math.random() * 120;

    return {
      id: `${Date.now()}-${index}-${Math.round(Math.random() * 1000)}`,
      icon,
      style: {
        "--particle-x": `${offsetX.toFixed(2)}%`,
        "--particle-y": `${offsetY.toFixed(2)}%`,
        "--particle-scale": scale.toFixed(2),
        "--particle-rotate": `${rotate.toFixed(2)}deg`,
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
      },
    };
  });

  return particles;
};
