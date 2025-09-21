/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Poppins", "ui-sans-serif", "system-ui"],
      },
      colors: {
        "night-sky": "#0b1120",
        "night-panel": "rgba(30,41,59,0.9)",
        "night-surface": "rgba(17,24,39,0.85)",
        "night-border": "rgba(148,163,184,0.35)",
        "accent-primary": "#8b5cf6",
        "accent-primary-strong": "#7c3aed",
        "accent-secondary": "#38bdf8",
        "accent-danger": "#f472b6",
        "accent-warning": "#facc15",
      },
      boxShadow: {
        glow: "0 35px 80px rgba(15,23,42,0.65)",
        panel: "0 35px 70px rgba(15,23,42,0.55)",
      },
      backgroundImage: {
        aurora:
          "radial-gradient(circle at top, rgba(79,70,229,0.25), transparent 55%), radial-gradient(circle at bottom, rgba(14,116,144,0.35), transparent 60%), linear-gradient(135deg, #0f172a, #111827 40%, #0b1120 100%)",
      },
    },
  },
  plugins: [],
};
