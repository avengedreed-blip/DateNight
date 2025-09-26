import React, { memo } from "react";

const TopBar = memo(({ title, onHelp, onSettings }) => (
  <div className="topbar">
    <button
      aria-label="Help"
      onClick={onHelp}
      className="btn"
      style={{ background: "transparent" }}
    >
      <span style={{ fontSize: 20 }}>❓</span>
    </button>
    <h1 className="brand-title" style={{ fontSize: 26 }}>{title}</h1>
    <button
      aria-label="Settings"
      onClick={onSettings}
      className="btn"
      style={{ background: "transparent" }}
    >
      <span style={{ fontSize: 20 }}>⚙️</span>
    </button>
  </div>
));

export default TopBar;
