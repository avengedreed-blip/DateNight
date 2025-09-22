import React from "react";

const LoadingScreen = ({ message, isError = false, onRetry }) => (
  <div className={`loading-screen ${isError ? "loading-screen--error" : ""}`}>
    <main
      className="loading-panel"
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <div className="loading-panel__spinner" aria-hidden="true">
        <span />
      </div>
      <h1 className="loading-panel__title">{message}</h1>
      <p className="loading-panel__text">
        {isError
          ? "We couldn't reach your shared data. Give it another try."
          : "Setting the mood for the perfect evening…"}
      </p>
      {isError && onRetry && (
        <button type="button" className="secondary-button" onClick={onRetry}>
          Try Again
        </button>
      )}
    </main>
  </div>
);

export default LoadingScreen;
