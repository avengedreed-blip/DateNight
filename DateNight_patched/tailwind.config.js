/** @type {import('tailwindcss').Config} */
const config = {
  mode: "jit",
  content: [
    "./index.html",
    "./public/**/*.{html,js,jsx,ts,tsx}",
    "./src/**/*.{html,js,jsx,ts,tsx}"
  ],
  darkMode: "media",
  theme: {
    extend: {}
  },
  plugins: []
};

export default config;
