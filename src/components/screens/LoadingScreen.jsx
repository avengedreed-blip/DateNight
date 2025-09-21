import React from "react";

const LoadingScreen = ({ message }) => (
  <div className="loading-screen">
    <main className="loading-panel">
      <h1 className="loading-panel__title">{message}</h1>
      <p className="loading-panel__text">Setting the mood for the perfect evening…</p>
    </main>
  </div>
);

export default LoadingScreen;
