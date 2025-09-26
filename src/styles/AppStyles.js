const AppStyles = `
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
  }

  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    height: 100%;
  }

  body {
    margin: 0;
    font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
    color: var(--text);
    background: radial-gradient(circle at 20% -10%, rgba(255, 255, 255, 0.08), transparent 55%),
      linear-gradient(180deg, var(--bg-start), var(--bg-end));
    transition: background 400ms ease, color 400ms ease;
  }

  .animated-background {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    background: linear-gradient(180deg, var(--bg-start), var(--bg-end));
    transition: background 400ms ease;
  }

  .animated-background::after {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.4), transparent 55%);
    opacity: 0;
    transition: opacity 300ms ease;
    z-index: 5;
  }

  .animated-background.screen-flash-active::after {
    opacity: 0.55;
  }

  .particle-canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
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
    transition: opacity 420ms ease, transform 420ms ease;
    z-index: 1;
  }

  .screen.enter {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
    z-index: 2;
  }

  .glass {
    background: rgba(17, 17, 17, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 25px 70px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .brand-title {
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
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
    transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
    background: rgba(255, 255, 255, 0.1);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn:not(:disabled):hover,
  .btn:not(:disabled):focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  }

  .x-btn {
    width: 100%;
  }

  .grad-pink {
    background: linear-gradient(135deg, var(--dare), color-mix(in srgb, var(--dare) 40%, #ffffff 60%));
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
    animation: fade-up 520ms ease forwards;
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
    transition: opacity 280ms ease, transform 280ms ease;
  }

  .modal-content.enter {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

export default AppStyles;
