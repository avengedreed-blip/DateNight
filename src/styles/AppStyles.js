export const AppStyles = `
/* Fonts are pre-imported */

/* --- REFINED IDLE & SPIN ANIMATIONS --- */
.wheel-pointer {
  animation: pointer-idle-glow 2.8s infinite ease-in-out;
}
.wheel-pointer::after {
  animation: gem-idle-glow 2.8s infinite ease-in-out;
}

@keyframes pointer-idle-glow {
  0%, 100% {
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4));
    transform: translateX(-50%) translateY(0);
  }
  50% {
    filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.3));
    transform: translateX(-50%) translateY(-2px);
  }
}

@keyframes gem-idle-glow {
  0%, 100% {
    box-shadow: 0 0 8px 2px var(--ring), 0 0 12px 4px color-mix(in srgb, var(--ring) 70%, transparent);
  }
  50% {
    box-shadow: 0 0 12px 4px var(--ring), 0 0 22px 8px color-mix(in srgb, var(--ring) 70%, transparent);
  }
}

/* REFINED: Spin glow is more intense and now animates the inner ring for a powerful effect */
.wheel.spinning::before {
  animation: spin-glow-ring 1.2s infinite alternate ease-out;
}
.wheel.spinning {
  animation: spin-glow-main 1.2s infinite alternate ease-out;
  transition: transform 4s cubic-bezier(0.25, 1, 0.5, 1);
}

@keyframes spin-glow-main {
  from { filter: brightness(1.0); }
  to { filter: brightness(1.2); }
}
@keyframes spin-glow-ring {
  from {
    opacity: 0.75;
    transform: scale(1);
    box-shadow: 0 0 25px color-mix(in srgb, var(--ring) 40%, transparent);
  }
  to {
    opacity: 1;
    transform: scale(1.02);
    box-shadow: 0 0 45px 5px color-mix(in srgb, var(--ring) 60%, transparent);
  }
}
`;
