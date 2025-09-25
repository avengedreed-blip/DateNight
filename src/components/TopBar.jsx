import React from "react";

const TopBar = React.memo(function TopBar({ onOpenSettings = () => {} }) {
  return (
    <header className="top-bar" role="banner">
      <div className="top-bar__inner">
        <h1 className="top-bar__title">Date Night</h1>
        <button
          type="button"
          className="top-bar__action"
          onClick={onOpenSettings}
          aria-label="Open settings"
        >
          <svg
            aria-hidden="true"
            className="top-bar__action-icon"
            viewBox="0 0 24 24"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M12 8.75a3.25 3.25 0 1 1 0 6.5a3.25 3.25 0 0 1 0-6.5Zm8.4 2.95l1.3 1.5a1 1 0 0 1-.08 1.41l-1.42 1.25c.03.27.05.54.05.81c0 .27-.02.54-.05.81l1.42 1.25a1 1 0 0 1 .08 1.41l-1.3 1.5a1 1 0 0 1-1.34.17l-1.67-.96c-.43.34-.9.63-1.41.85l-.32 1.9a1 1 0 0 1-.98.82h-2.6a1 1 0 0 1-.98-.82l-.32-1.9a6.92 6.92 0 0 1-1.41-.85l-1.67.96a1 1 0 0 1-1.34-.17l-1.3-1.5a1 1 0 0 1 .08-1.41l1.42-1.25c-.03-.27-.05-.54-.05-.81c0-.27.02-.54.05-.81l-1.42-1.25a1 1 0 0 1-.08-1.41l1.3-1.5a1 1 0 0 1 1.34-.17l1.67.96c.43-.34.9-.63 1.41-.85l.32-1.9a1 1 0 0 1 .98-.82h2.6a1 1 0 0 1 .98.82l.32 1.9c.51.22.98.51 1.41.85l1.67-.96a1 1 0 0 1 1.34.17Z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
});

export default TopBar;
