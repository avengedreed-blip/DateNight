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

/* --- Game Screen Layout & Background Glow --- */
.game-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow: hidden;
  position: relative;
}

.game-screen::before {
  content: "";
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(90vw, 700px);
  height: min(90vw, 700px);
  background: radial-gradient(circle, var(--glow-color, #ff477e50) 0%, transparent 65%);
  filter: blur(120px);
  opacity: 0.4;
  z-index: -1;
  pointer-events: none;
}

.game-main {
  flex-grow: 1;
  display: grid;
  grid-template-rows: auto auto 1fr;
  align-items: center;
  justify-items: center;
  gap: clamp(1rem, 4vh, 1.5rem);
  padding: 1rem 1rem 2rem;
}

.spin-button {
  width: clamp(180px, 40vw, 240px);
  min-height: 54px;
  padding: 0.8rem 1.5rem;
  border-radius: 1rem;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--label-color, #fff);
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.3s ease, filter 0.3s ease;
  will-change: transform, box-shadow;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.35);
}

.spin-button:hover:not(:disabled) {
  transform: scale(1.05) translateY(-4px);
  box-shadow: 0 10px 35px color-mix(in srgb, var(--glow-color, #fff) 60%, transparent);
  filter: brightness(1.1);
}

.spin-button:active:not(:disabled) {
  transform: scale(0.98);
}

.spin-button:disabled {
  cursor: not-allowed;
  filter: saturate(0.5) brightness(0.7);
  box-shadow: none;
}

.game-main > *:last-child {
  align-self: end;
}

/* --- Start Screen Styles --- */
/* --- Start Screen Container & Background --- */
.start-screen-container {
  display: grid;
  place-content: center;
  min-height: 100vh; /* Use 100dvh in production for best mobile results */
  padding: 1rem;
  overflow: hidden;
  position: relative;
}

.start-screen-container::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(80vw, 600px);
  height: min(80vw, 600px);
  background: radial-gradient(circle, var(--glow-color, #ff477e50) 0%, transparent 70%);
  filter: blur(100px);
  opacity: 0.5;
  z-index: -1;
}

/* --- Glassmorphism Card --- */
.glass-card {
  width: min(92vw, 520px);
  padding: clamp(1.5rem, 5vw, 2.5rem);
  border-radius: 1.75rem;
  text-align: center;
  background: var(--bg-overlay, rgba(20, 20, 30, 0.6));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--shadow-strong, rgba(0, 0, 0, 0.5) 0px 10px 40px);
}

/* --- Typography --- */
.brand-title {
  font-size: clamp(2.8rem, 10vw, 3.5rem);
  font-weight: 800;
  margin: 0 0 0.5rem;
  color: var(--label-color, #fff);
  letter-spacing: -0.02em;
  text-shadow: 0 2px 20px var(--glow-color, #fff);
}

.subtitle {
  font-size: clamp(1rem, 4vw, 1.125rem);
  opacity: 0.9;
  margin: 0 0 2.5rem;
  color: var(--label-color, #fff);
}

/* --- Buttons --- */
.button-group {
  display: grid;
  gap: 1rem;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 52px;
  padding: 0.75rem 1.5rem;
  border-radius: 0.85rem;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--label-color, #fff);
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  will-change: transform, box-shadow;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.btn:hover {
  transform: scale(1.03) translateY(-3px);
  box-shadow: 0 8px 30px color-mix(in srgb, var(--glow-color, #fff) 50%, transparent);
}

.btn:active {
  transform: scale(0.98);
}

/* Theme-aware button gradients */
.grad-truth { background: linear-gradient(45deg, var(--truth-color), color-mix(in srgb, var(--truth-color) 70%, var(--ring-strong))); }
.grad-dare { background: linear-gradient(45deg, var(--dare-color), color-mix(in srgb, var(--dare-color) 70%, var(--consequence-color))); }
.grad-trivia { background: linear-gradient(45deg, var(--trivia-color), color-mix(in srgb, var(--trivia-color) 70%, var(--ring-faint))); }

`;
