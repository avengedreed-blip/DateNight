import React, { useMemo } from "react";

const clamp = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (numeric < 0) {
    return 0;
  }
  if (numeric > 100) {
    return 100;
  }
  return Math.round(numeric);
};

const AdrenalineBar = ({ value = 0 }) => {
  const progress = useMemo(() => clamp(value), [value]);
  const isCharged = progress >= 80;

  return (
    <div
      className={`adrenaline-bar${isCharged ? " adrenaline-bar--charged" : ""}`}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Adrenaline"
    >
      <div className="adrenaline-bar__header">
        <span className="adrenaline-bar__label">Adrenaline</span>
        <span className="adrenaline-bar__value">{progress}%</span>
      </div>
      <div className="adrenaline-bar__track">
        <div className="adrenaline-bar__fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default AdrenalineBar;
