import { memo } from "react";

import "./TopBar.css";

const ICONS = {
  help: "❓",
  settings: "⚙️",
};

const TopBar = memo(({ title, subtitle, onHelp, onSettings }) => {
  const renderActionButton = (label, iconKey, handler) => (
    <button
      type="button"
      aria-label={label}
      onClick={handler}
      className="btn btn-icon"
      disabled={!handler}
    >
      <span aria-hidden="true" className="topbar__icon">
        {ICONS[iconKey]}
      </span>
    </button>
  );

  return (
    <header className="topbar glass">
      <div className="topbar__actions">
        {renderActionButton("Help", "help", onHelp)}
      </div>

      <div className="topbar__title" role="presentation">
        <h1 className="brand-title topbar__brand" title={title}>
          {title}
        </h1>
        {subtitle ? <p className="topbar__subtitle">{subtitle}</p> : null}
      </div>

      <div className="topbar__actions">
        {renderActionButton("Settings", "settings", onSettings)}
      </div>
    </header>
  );
});

TopBar.displayName = "TopBar";

export default TopBar;
