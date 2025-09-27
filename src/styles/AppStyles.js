export const AppStyles = `
/* Fonts are pre-imported in index.html or another global CSS file */

/* … unchanged animations … */

/* Wheel Polish */
.pointer {
  position: absolute; left: 50%; top: -6px; transform: translateX(-50%);
  width: 0; height: 0; border-left: 14px solid transparent; border-right: 14px solid transparent; border-bottom: 24px solid var(--ring-color);
  z-index: 3;
  animation: pointer-pulse 2.5s infinite ease-in-out;
}

@keyframes spin-glow {
  0%, 100% {
    box-shadow: 0 0 20px 0px var(--ring-color, #fff),
                0 0 40px 10px var(--theme-primary, var(--truth-color)),
                inset 0 0 0 2px rgba(255,255,255,.06);
  }
  50% {
    box-shadow: 0 0 35px 5px var(--ring-color, #fff),
                0 0 60px 20px var(--theme-primary, var(--truth-color)),
                inset 0 0 0 2px rgba(255,255,255,.06);
  }
}
.wheel.spinning { animation: spin-glow 1.2s infinite alternate; }

/* Modal Polish with fallback layering */
.modal-overlay {
  position: fixed; inset: 0; z-index: 200;
  display: grid; place-items: center;
  background: rgba(10, 12, 18, 0.9); /* always present fallback */
  opacity: 0;
  animation: fade-in 0.3s ease forwards;
}
@supports (backdrop-filter: blur(8px)) or (-webkit-backdrop-filter: blur(8px)) {
  .modal-overlay {
    background: rgba(10, 12, 18, 0.5); /* lighter background when blur is active */
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
}
`;
