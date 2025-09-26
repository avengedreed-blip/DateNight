import React, { useRef, useState, useEffect, useCallback, memo, useMemo } from "react";
import "./Wheel.css";

export const SLICE_LABELS = ["Truth", "Dare", "Trivia"];
export const SLICE_CENTERS = [60, 180, 300];

const SLICE_COLORS = ["var(--truth)", "var(--dare)", "var(--trivia)"];
const CENTER = 50;
const RADIUS = 50;
const LABEL_RADIUS_RATIO = 0.62;
const LABEL_PADDING = 6;

const polarToCartesian = (cx, cy, radius, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
};

const describeSlicePath = (startAngle, endAngle) => {
  const start = polarToCartesian(CENTER, CENTER, RADIUS, startAngle);
  const end = polarToCartesian(CENTER, CENTER, RADIUS, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${CENTER} ${CENTER}`,
    `L ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
    `A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
    "Z",
  ].join(" ");
};

const describeLabelArc = (startAngle, endAngle, radius) => {
  const start = polarToCartesian(CENTER, CENTER, radius, startAngle);
  const end = polarToCartesian(CENTER, CENTER, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
  ].join(" ");
};

const Wheel = memo(({ isSpinning, rotation, onDone }) => {
  const wheelEl = useRef(null);
  const [bounce, setBounce] = useState(false);

  const slices = useMemo(() => {
    const labelRadius = RADIUS * LABEL_RADIUS_RATIO;
    return SLICE_LABELS.map((label, index) => {
      const startAngle = index * 120;
      const endAngle = startAngle + 120;
      return {
        label,
        color: SLICE_COLORS[index] ?? SLICE_COLORS[0],
        slicePath: describeSlicePath(startAngle, endAngle),
        labelPath: describeLabelArc(
          startAngle + LABEL_PADDING,
          endAngle - LABEL_PADDING,
          labelRadius
        ),
        id: `wheel-slice-${index}`,
        labelPathId: `wheel-label-path-${index}`,
      };
    });
  }, []);

  const handleTransitionEnd = useCallback((ev) => {
    if (ev.propertyName !== "transform") return;
    setBounce(true);
    setTimeout(() => setBounce(false), 500);
    onDone?.();
  }, [onDone]);

  useEffect(() => {
    const el = wheelEl.current;
    if (!el) return;
    if (isSpinning) {
      el.addEventListener("transitionend", handleTransitionEnd);
    }
    return () => el.removeEventListener("transitionend", handleTransitionEnd);
  }, [isSpinning, handleTransitionEnd]);

  return (
    <div className="wheel-container" style={{ position: "relative" }}>
      <div className="wheel-pointer" style={{ borderBottomColor: "var(--ring)" }} />
      <div
        ref={wheelEl}
        className={`wheel ${bounce ? "wheel-bounce" : ""}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          width: "var(--wheel-size, 100%)",
          height: "var(--wheel-size, 100%)",
        }}
      >
        <svg
          className="wheel-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            {slices.map((slice) => (
              <path key={slice.labelPathId} id={slice.labelPathId} d={slice.labelPath} fill="none" />
            ))}
          </defs>
          {slices.map((slice) => (
            <g key={slice.id}>
              <path d={slice.slicePath} fill={slice.color} />
              <text
                className="wheel-label-text has-shadow"
                fill="var(--text)"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: "clamp(14px, 2.5vw, 28px)" }}
              >
                <textPath
                  href={`#${slice.labelPathId}`}
                  xlinkHref={`#${slice.labelPathId}`}
                  startOffset="50%"
                >
                  {slice.label}
                </textPath>
              </text>
            </g>
          ))}
        </svg>
        {[0, 120, 240].map((deg, i) => (
          <div key={i} className="wheel-separator" style={{ transform: `rotate(${deg}deg)` }} />
        ))}
      </div>
    </div>
  );
});

export default Wheel;
