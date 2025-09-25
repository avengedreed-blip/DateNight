import React, { useCallback } from "react";

const BottomNav = React.memo(function BottomNav({
  onToggleMode = () => {},
  onOpenThemes = () => {},
  onOpenHelp = () => {},
  extremeOnly = false,
}) {
  const handleModeClick = useCallback(() => {
    onToggleMode();
  }, [onToggleMode]);

  const handleThemeClick = useCallback(() => {
    onOpenThemes();
  }, [onOpenThemes]);

  const handleHelpClick = useCallback(() => {
    onOpenHelp();
  }, [onOpenHelp]);

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <button
        type="button"
        className="bottom-nav__action"
        onClick={handleModeClick}
        aria-pressed={extremeOnly}
      >
        <span className="bottom-nav__label">Modes</span>
        <span className="bottom-nav__meta">
          {extremeOnly ? "Extreme" : "Classic"}
        </span>
      </button>
      <button
        type="button"
        className="bottom-nav__action"
        onClick={handleThemeClick}
      >
        <span className="bottom-nav__label">Themes</span>
        <span className="bottom-nav__meta">Live</span>
      </button>
      <button
        type="button"
        className="bottom-nav__action"
        onClick={handleHelpClick}
      >
        <span className="bottom-nav__label">Help</span>
        <span className="bottom-nav__meta">FAQ</span>
      </button>
    </nav>
  );
});

export default BottomNav;
