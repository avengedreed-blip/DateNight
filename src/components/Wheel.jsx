import React, { useRef, useState, useEffect, useCallback, memo } from "react";
import "./Wheel.css";

export const SLICE_LABELS = ["Truth", "Dare", "Trivia"];
export const SLICE_CENTERS = [330, 90, 210];
export const POINTER_ANGLE = 270;

const Wheel = memo(({ isSpinning, rotation, onDone }) => {
  const wheelEl = useRef(null);
  const [bounce, setBounce] = useState(false);

  const handleTransitionEnd = useCallback(
    (ev) => {
      if (ev.propertyName !== "transform") return;
      setBounce(true);
      setTimeout(() => setBounce(false), 500);
      onDone?.();
    },
    [onDone]
  );

  useEffect(() => {
    const el = wheelEl.current;
    if (!el) return;
    if (isSpinning) {
      el.addEventListener("transitionend", handleTransitionEnd);
    }
    return () => el.removeEventListener("transitionend", handleTransitionEnd);
  }, [isSpinning, handleTransitionEnd]);

  return (
    <div className="wheel-wrap" style={{ position: "relative" }}>
      <div className="pointer" />
      <div
        ref={wheelEl}
        className={`wheel ${bounce ? "wheel-bounce" : ""} ${
          isSpinning ? "spinning" : ""
        }`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div className="wheel-bg" />
        {[0, 120, 240].map((deg, i) => (
          <div
            key={i}
            className="separator"
            style={{ transform: `rotate(${deg}deg)` }}
          />
        ))}
        {SLICE_LABELS.map((label, i) => {
          const center = SLICE_CENTERS[i];
          return (
            <div
              key={label}
              className="label"
              style={{
                transform: `rotate(${center}deg) translateY(calc(-1 * var(--labelRadius))) rotate(${-center}deg)`,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default Wheel;
