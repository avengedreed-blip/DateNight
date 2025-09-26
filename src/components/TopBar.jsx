import React, { memo } from "react";
import "./TopBar.css";

const TopBar = memo(({ title, onHelp, onSettings }) => (
  <header className="top-bar glass">
    <div className="top-bar__inner">
      <button aria-label="Help" onClick={onHelp} className="top-bar__action" type="button">
        <span className="top-bar__action-icon" aria-hidden="true">
          ❓
        </span>
      </button>
      <h1 className="top-bar__title">{title}</h1>
      <button aria-label="Settings" onClick={onSettings} className="top-bar__action" type="button">
        <span className="top-bar__action-icon" aria-hidden="true">
          ⚙️
        </span>
      </button>
    </div>
  </header>
));

export default TopBar;
