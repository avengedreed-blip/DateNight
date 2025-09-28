import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker to enable offline caching and PWA behaviour.
// In browsers that support service workers, this will install the sw.js file
// from the public directory and cache the app shell and runtime assets.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('Service worker registration failed', err);
      });
  });
}
