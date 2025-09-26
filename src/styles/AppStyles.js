export const AppStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Rampart+One&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=swap');

:root {
  --bg-start:#0B0F14; --bg-end:#0E1320;
  --truth:#00E6D0; --dare:#FF477E; --trivia:#7AA2FF;
  --text:#fff; --text-weak:rgba(255,255,255,.82);
  --ring:#fff; --meter-bg:#1A1A1A; --meter-a:#00E6D0; --meter-b:#FF477E;
  --theme-primary: #00E6D0;
  --wheel-size:min(86vw, calc(100vh - 260px));
  --labelRadius:58%;
}
@media (min-width: 900px) {
  :root {
    --wheel-size:min(520px, calc(100vh - 260px));
    --labelRadius:56%;
  }
}

/* Reset & global */
* { box-sizing:border-box; }
html, body, #root { height:100%; }
body {
  margin:0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  background:linear-gradient(180deg,var(--bg-start),var(--bg-end));
  color:var(--text);
  transition:background .5s ease-in-out, color .3s ease-in-out;
  overflow-x:hidden;
}

/* Animations */
@keyframes screen-flash { 0% { box-shadow: inset 0 0 0 0 rgba(255,255,255,0); } 50% { box-shadow: inset 0 0 200px 50px rgba(255,255,255,0.4); } 100% { box-shadow: inset 0 0 0 0 rgba(255,255,255,0); } }
.screen-flash-active { animation: screen-flash 0.6s ease-out forwards; }

@keyframes background-pan { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
.animated-background {
  background-size: 200% 200%;
  animation: background-pan 15s infinite ease-in-out;
}

/* Glass */
@keyframes idle-glow { 0%, 100% { box-shadow: 0 10px 36px rgba(0,0,0,.45), 0 0 10px -5px var(--theme-primary); } 50% { box-shadow: 0 10px 36px rgba(0,0,0,.45), 0 0 20px -5px var(--theme-primary); } }
.glass { 
  backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%);
  background: rgba(20, 25, 40, .72); border: 1px solid rgba(255,255,255,.12);
  animation: idle-glow 4s infinite ease-in-out;
}

/* Particles */
.particles { position:fixed; inset:0; z-index:-1; pointer-events:none; transition:opacity .35s ease; opacity:0; animation: fade-in 0.5s ease-out 200ms forwards; }

/* Screen fade/slide */
@keyframes fade-slide-in {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
.screen { position:absolute; inset:0; display:grid; place-items:center; opacity:0; transform:translateY(18px); transition:opacity .35s cubic-bezier(0.25, 1, 0.5, 1), transform .35s cubic-bezier(0.25, 1, 0.5, 1); pointer-events:none; }
.screen.enter { opacity:1; transform:translateY(0); pointer-events:auto; }

/* Staggered Animations */
.screen.enter .animate-in { animation: fade-slide-in 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; opacity: 0; }
.screen.enter .delay-1 { animation-delay: 100ms; }
.screen.enter .delay-2 { animation-delay: 200ms; }
.screen.enter .delay-3 { animation-delay: 300ms; }
.screen.enter .delay-4 { animation-delay: 400ms; }

/* Title font */
@keyframes breathe { 0%, 100% { transform: scale(1); text-shadow:0 2px 6px rgba(0,0,0,.35); } 50% { transform: scale(1.02); text-shadow:0 4px 12px rgba(0,0,0,.45); } }
.brand-title { 
  font-family: "Baloo 2", "Rampart One", Inter, system-ui, sans-serif; 
  letter-spacing:.5px; 
  animation: breathe 3s infinite ease-in-out;
  color: var(--text);
}

/* Top bar */
.topbar { position:fixed; inset-inline:0; top:0; display:flex; align-items:center; justify-content:space-between; padding:14px 18px; z-index:20; }

/* Wheel */
.wheel-wrap { width:var(--wheel-size); aspect-ratio:1/1; margin-inline:auto; user-select:none; }
@keyframes faint-pulse { 0%, 100% { filter: drop-shadow(0 3px 3px rgba(0,0,0,.45)); } 50% { filter: drop-shadow(0 5px 12px rgba(255,255,255,.5)); } }
.pointer {
  position:absolute; left:50%; top:-6px; transform:translateX(-50%);
  width:0; height:0; border-left:12px solid transparent; border-right:12px solid transparent; border-bottom:22px solid var(--ring);
  z-index:3;
  animation: faint-pulse 2.5s infinite ease-in-out;
}
.wheel {
  position:relative; width:100%; height:100%; border-radius:999px; overflow:hidden;
  transition: transform 4s cubic-bezier(.25,1,.5,1); will-change:transform;
  box-shadow: 0 22px 60px rgba(0,0,0,.35), inset 0 0 0 2px rgba(255,255,255,.06);
}
@keyframes spin-glow { 0%, 100% { box-shadow: 0 0 20px 0px var(--ring, #fff), 0 0 35px 8px var(--theme-primary, var(--truth)); } 50% { box-shadow: 0 0 30px 5px var(--ring, #fff), 0 0 50px 15px var(--theme-primary, var(--truth)); } }
.wheel.spinning { animation: spin-glow 1s infinite alternate; }
@keyframes wheel-bounce { 0%{transform:scale(1)} 55%{transform:scale(1.03)} 100%{transform:scale(1)} }
.wheel-bounce { animation: wheel-bounce .5s ease-out both; }
@keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
.wheel-bg {
  position:absolute; inset:0;
  background-image:
    radial-gradient(120% 120% at 36% 24%, rgba(255,255,255,.16), rgba(0,0,0,.28) 70%),
    conic-gradient(from -90deg,
      var(--truth) 0deg 120deg,
      var(--dare) 120deg 240deg,
      var(--trivia) 240deg 360deg
    );
}
.wheel-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(100deg, transparent, rgba(255,255,255,0.15), transparent);
  animation: shimmer 5s infinite;
}
.separator { position:absolute; left:50%; top:50%; width:2px; height:50%; background:rgba(255,255,255,.18); transform-origin:top; }
.label {
  position:absolute; left:50%; top:50%; width:50%; transform-origin:0 0;
  text-align:center; color: var(--text); text-shadow:0 2px 5px rgba(0,0,0,.7);
  font-weight:800; letter-spacing:.04em; font-size: clamp(18px, 3.6vw, 30px);
}

/* Meter */
.meter { width:min(500px, 82vw); margin:10px auto 0; }
.meter-track { height:6px; width:100%; background:var(--meter-bg); border-radius:999px; overflow:hidden; box-shadow:inset 0 1px 2px rgba(0,0,0,.5); }
.meter-fill { height:100%; background:linear-gradient(90deg,var(--meter-a),var(--meter-b)); width:0%; transition:width .45s ease, box-shadow .45s ease; }
@keyframes meter-pulse { 0%, 100% { box-shadow: 0 0 8px -2px var(--meter-a); } 50% { box-shadow: 0 0 12px 0px var(--meter-a); } }
.meter-fill.pulsing { animation: meter-pulse 2s infinite ease-in-out; }

/* Buttons */
.btn {
  display:inline-flex; align-items:center; justify-content:center;
  border:none; border-radius:999px; padding:14px 22px; font-weight:800; font-size:18px;
  color:var(--text); cursor:pointer; 
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity .25s;
}
.btn:hover { 
  transform:translateY(-2px) scale(1.05); 
  box-shadow: 0 0 15px -2px var(--theme-primary), 0 4px 15px rgba(0,0,0,.2); 
}
.btn:active { 
  transform:translateY(0) scale(0.95); 
  box-shadow: none;
}
.x-btn { width:100%; padding:16px 22px; border-radius:16px; }
.grad-pink { background:linear-gradient(135deg,#ff6aa0,#ff3d77); }
.grad-neon { background:linear-gradient(135deg,#1fdc72,#1ea1ff); }
.grad-aurora { background:linear-gradient(135deg,#8c5cff,#2b6fff); }

/* Modal */
@keyframes modal-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes modal-bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
.modal-content.enter { animation: modal-in 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards, modal-bounce 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.25s forwards; }
.modal-content.enter .btn { animation: fade-slide-in 0.4s ease-out forwards; opacity: 0; }
.modal-content.enter .btn.delay-1 { animation-delay: 0.3s; }
.modal-content.enter .btn.delay-2 { animation-delay: 0.35s; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .brand-title, .pointer, .wheel.spinning, .meter-fill.pulsing, .glass, .particles, .btn:hover, .btn:active, .wheel-bounce, .modal-content.enter, .screen.enter .animate-in {
    animation: none !important;
    transition: none !important;
  }
}
`;
