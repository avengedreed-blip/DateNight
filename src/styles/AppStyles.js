export const AppStyles = `
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@600;700&display=swap");

  :root {
    --bg-start: #0b0f14;
    --bg-end: #0e1320;
    --text: #ffffff;
    --ring: #ffffff;
    --theme-primary: #00e6d0;
    --truth: #00e6d0;
    --dare: #ff477e;
    --trivia: #7aa2ff;
    --meter-a: #00e6d0;
    --meter-b: #ff477e;
    --shadow-weak: 0 10px 45px rgba(0, 0, 0, 0.25);
    --shadow-soft: 0 25px 70px rgba(0, 0, 0, 0.35);
    --shadow-strong: 0 40px 120px rgba(0, 0, 0, 0.55);
    --glass-bg: rgba(18, 22, 32, 0.32);
    --glass-border: rgba(255, 255, 255, 0.16);
    --glass-highlight: rgba(255, 255, 255, 0.38);
    --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
    --font-display: "Playfair Display", "Times New Roman", serif;
    --dur-short: 160ms;
    --dur-medium: 360ms;
    --dur-long: 620ms;
    --ease-standard: cubic-bezier(0.33, 1, 0.68, 1);
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-soft: cubic-bezier(0.22, 0.61, 0.36, 1);
    --wheel-size: min(86vw, calc(100vh - 260px));
    --labelRadius: calc(var(--wheel-size) / 2.6);
    color-scheme: dark;
    background-color: var(--bg-start);
  }

  @media (max-width: 640px) {
    :root {
      --wheel-size: min(92vw, calc(100vh - 220px));
    }
  }

  @media (min-width: 900px) {
    :root {
      --wheel-size: min(520px, calc(100vh - 280px));
    }
  }

  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    min-height: 100%;
  }

  body {
    margin: 0;
    font-family: var(--font-sans);
    line-height: 1.5;
    color: var(--text);
    background:
      radial-gradient(circle at 18% -12%, rgba(255, 255, 255, 0.08), transparent 55%),
      radial-gradient(circle at 82% 120%, rgba(255, 255, 255, 0.04), transparent 65%),
      linear-gradient(180deg, var(--bg-start), var(--bg-end));
    transition: background var(--dur-long) var(--ease-soft), color var(--dur-medium) var(--ease-soft);
    -webkit-font-smoothing: antialiased;
  }

  .animated-background {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    background: linear-gradient(180deg, var(--bg-start), var(--bg-end));
    transition: background var(--dur-long) var(--ease-soft);
    isolation: isolate;
  }

  .animated-background::before,
  .animated-background::after {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    transition: opacity var(--dur-medium) var(--ease-standard), transform var(--dur-long) var(--ease-soft);
    z-index: 0;
  }

  .animated-background::before {
    background: radial-gradient(140% 120% at 15% -20%, color-mix(in srgb, var(--bg-end) 45%, transparent) 0%, transparent 70%);
    opacity: 0.65;
    transform: translate3d(0, 0, 0);
  }

  .animated-background::after {
    background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.4), transparent 55%);
    opacity: 0;
  }

  .animated-background.screen-flash-active::after {
    opacity: 0.55;
  }

  .particle-canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
  }

  .screen {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: clamp(1.5rem, 4vw, 3rem);
    opacity: 0;
    transform: translateY(18px) scale(0.99);
    pointer-events: none;
    transition: opacity var(--dur-long) var(--ease-standard), transform var(--dur-long) var(--ease-standard);
    z-index: 2;
  }

  .screen.enter {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
    z-index: 3;
  }

  .glass {
    position: relative;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-soft);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    color: inherit;
  }

  .glass::before {
    content: "";
    position: absolute;
    inset: 1px;
    border-radius: inherit;
    border: 1px solid rgba(255, 255, 255, 0.05);
    pointer-events: none;
    mix-blend-mode: screen;
    opacity: 0.35;
  }

  .brand-title {
    font-family: var(--font-display);
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .has-shadow {
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45), 0 0 16px rgba(0, 0, 0, 0.2);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.85rem 1.9rem;
    border-radius: 999px;
    border: none;
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    color: #ffffff;
    transition: transform var(--dur-short) var(--ease-standard), box-shadow var(--dur-short) var(--ease-standard), opacity var(--dur-short) var(--ease-standard);
    background: rgba(255, 255, 255, 0.12);
    position: relative;
    overflow: hidden;
  }

  .btn::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.22), transparent 70%);
    opacity: 0;
    transition: opacity var(--dur-short) var(--ease-standard);
    pointer-events: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn:not(:disabled):hover,
  .btn:not(:disabled):focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 18px 38px rgba(0, 0, 0, 0.35);
  }

  .btn:not(:disabled):hover::after,
  .btn:not(:disabled):focus-visible::after {
    opacity: 0.4;
  }

  .x-btn {
    width: 100%;
  }

  .grad-pink {
    background: linear-gradient(135deg, var(--dare), color-mix(in srgb, var(--dare) 38%, #ffffff 62%));
  }

  .grad-neon {
    background: linear-gradient(135deg, #39ff14, #1e90ff);
  }

  .grad-aurora {
    background: linear-gradient(135deg, #5bc0be, #9d4edd);
  }

  .animate-in {
    opacity: 0;
    transform: translateY(20px);
    animation: fade-up 520ms var(--ease-standard) forwards;
  }

  .delay-1 { animation-delay: 80ms; }
  .delay-2 { animation-delay: 160ms; }
  .delay-3 { animation-delay: 240ms; }
  .delay-4 { animation-delay: 320ms; }
  .delay-5 { animation-delay: 400ms; }

  @keyframes fade-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes splash-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .modal-content {
    opacity: 0;
    transform: translateY(18px) scale(0.96);
    transition: opacity 280ms var(--ease-standard), transform 280ms var(--ease-standard);
    will-change: opacity, transform;
  }

  .modal-content.enter {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .meter {
    width: min(420px, 92vw);
    padding: 16px 18px 22px;
    border-radius: 24px;
    margin: 0 auto;
    background: rgba(0, 0, 0, 0.35);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06), 0 20px 45px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(12px) saturate(150%);
    -webkit-backdrop-filter: blur(12px) saturate(150%);
  }

  .meter-track {
    position: relative;
    width: 100%;
    height: 18px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02));
    overflow: hidden;
  }

  .meter-track::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid rgba(255, 255, 255, 0.14);
    pointer-events: none;
  }

  .meter-fill {
    position: relative;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--meter-a), var(--meter-b));
    box-shadow: 0 0 25px rgba(255, 255, 255, 0.25);
    transition: width var(--dur-long) var(--ease-soft);
  }

  .meter-fill::after {
    content: "";
    position: absolute;
    inset: 3px 4px;
    border-radius: inherit;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent 70%);
    opacity: 0.55;
    pointer-events: none;
  }

  .meter-fill.pulsing {
    animation: meter-charge 1400ms var(--ease-spring) infinite;
  }

  @keyframes meter-charge {
    0% {
      box-shadow: 0 0 25px rgba(255, 255, 255, 0.25);
      filter: saturate(1);
    }
    50% {
      box-shadow: 0 0 45px rgba(255, 255, 255, 0.45);
      filter: saturate(1.15);
    }
    100% {
      box-shadow: 0 0 25px rgba(255, 255, 255, 0.25);
      filter: saturate(1);
    }
  }

  .wheel-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--wheel-size);
    max-width: 520px;
    aspect-ratio: 1 / 1;
    margin: 0 auto;
    z-index: 0;
  }

  .wheel-container::before {
    content: "";
    position: absolute;
    inset: 12%;
    background: radial-gradient(circle at center, color-mix(in srgb, var(--ring) 35%, transparent) 0%, color-mix(in srgb, var(--ring) 15%, transparent) 45%, transparent 75%);
    filter: blur(24px);
    opacity: 0.8;
    z-index: -2;
    pointer-events: none;
  }

  .wheel-container::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(255, 255, 255, 0.18), transparent 60%);
    opacity: 0.4;
    z-index: -3;
    pointer-events: none;
  }

  .wheel {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    overflow: hidden;
    background:
      conic-gradient(
        from -90deg,
        color-mix(in srgb, var(--truth) 88%, white 12%) 0deg,
        color-mix(in srgb, var(--truth) 78%, black 22%) 120deg,
        color-mix(in srgb, var(--dare) 88%, white 12%) 120deg,
        color-mix(in srgb, var(--dare) 78%, black 22%) 240deg,
        color-mix(in srgb, var(--trivia) 88%, white 12%) 240deg,
        color-mix(in srgb, var(--trivia) 78%, black 22%) 360deg
      );
    border: 1.5px solid rgba(255, 255, 255, 0.12);
    box-shadow:
      0 0 35px rgba(0, 0, 0, 0.45),
      0 0 65px rgba(90, 148, 255, 0.18),
      inset 0 0 18px rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(14px);
    transition: transform 3s cubic-bezier(0.2, 0.7, 0.3, 1);
    will-change: transform;
  }

  .wheel::before {
    content: "";
    position: absolute;
    inset: 3%;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--ring) 40%, transparent);
    box-shadow: 0 0 20px color-mix(in srgb, var(--ring) 30%, transparent);
    opacity: 0.55;
    pointer-events: none;
    z-index: 1;
  }

  .wheel::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.25), transparent 60%);
    mix-blend-mode: screen;
    opacity: 0.4;
    pointer-events: none;
    z-index: 1;
  }

  .wheel-bounce {
    animation: wheel-bounce 0.5s var(--ease-spring);
  }

  @keyframes wheel-bounce {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.02);
    }
    100% {
      transform: scale(1);
    }
  }

  .wheel-svg {
    position: relative;
    width: 100%;
    height: 100%;
    z-index: 2;
  }

  .wheel-svg g path {
    fill: transparent;
    stroke-width: 0.35px;
    mix-blend-mode: lighten;
  }

  .wheel-svg g:nth-of-type(1) path {
    stroke: color-mix(in srgb, var(--truth) 80%, white 20%);
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--truth) 45%, transparent));
  }

  .wheel-svg g:nth-of-type(2) path {
    stroke: color-mix(in srgb, var(--dare) 80%, white 20%);
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--dare) 45%, transparent));
  }

  .wheel-svg g:nth-of-type(3) path {
    stroke: color-mix(in srgb, var(--trivia) 80%, white 20%);
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--trivia) 45%, transparent));
  }

  .wheel-label-text {
    font-family: var(--font-sans);
    font-weight: 700;
    fill: #fff !important;
    font-size: clamp(14px, calc(var(--labelRadius) / 2.4), 28px);
    letter-spacing: 0.12em;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45), 0 0 8px rgba(0, 0, 0, 0.35);
    pointer-events: none;
  }

  .wheel-separator {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 1.5px;
    height: calc(var(--labelRadius) * 2.1);
    transform-origin: center top;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.05));
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
    z-index: 3;
  }

  .wheel-pointer {
    position: absolute;
    top: calc(50% - var(--wheel-size) / 2 - 18px);
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 16px solid transparent;
    border-right: 16px solid transparent;
    border-bottom: 26px solid var(--ring);
    filter: drop-shadow(0 0 12px color-mix(in srgb, var(--ring) 55%, transparent));
    z-index: 5;
  }

  .wheel-pointer::after {
    content: "";
    position: absolute;
    top: 70%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--ring);
    box-shadow: 0 0 12px color-mix(in srgb, var(--ring) 70%, transparent);
  }

  input[type="range"] {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
    outline: none;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--theme-primary);
    box-shadow: 0 0 18px color-mix(in srgb, var(--theme-primary) 65%, transparent);
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.8);
  }

  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--theme-primary);
    box-shadow: 0 0 18px color-mix(in srgb, var(--theme-primary) 65%, transparent);
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.8);
  }

  input[type="range"]::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
  }

  input[type="range"]::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;
