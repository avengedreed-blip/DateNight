import React, { useMemo } from "react";

const Wheel = ({
  rotation,
  isExtremeRound,
  segments,
  children,
  showPulse,
  spinDuration,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  isSpinning,
}) => {
  const gradient = useMemo(() => {
    if (!segments?.length) {
      return undefined;
    }

    const sliceSize = 360 / segments.length;
    const stops = segments
      .map((segment, index) => {
        const start = index * sliceSize;
        const end = (index + 1) * sliceSize;
        return `${segment.color} ${start}deg ${end}deg`;
      })
      .join(", ");

    return `conic-gradient(${stops})`;
  }, [segments]);

  const labels = useMemo(() => {
    if (!segments?.length) {
      return [];
    }

    const sliceAngle = 360 / segments.length;
    const radiusFactor = 0.5;

    return segments.map((segment, index) => {
      const id = segment.id ?? segment.label ?? index;
      const label =
        segment.label ?? segment.title ?? segment.id ?? `Segment ${index + 1}`;
      const midpointDeg = index * sliceAngle + sliceAngle / 2;
      const radians = ((midpointDeg - 90) * Math.PI) / 180;
      const radius = 50 * radiusFactor;
      const x = 50 + radius * Math.cos(radians);
      const y = 50 + radius * Math.sin(radians);

      return {
        id,
        label,
        x,
        y,
      };
    });
  }, [segments]);

  return (
    <div
      className="wheel-wrapper"
      role="presentation"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
    >
      <div
        className={`wheel ${isExtremeRound ? "wheel--extreme" : ""}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          background: gradient,
          "--spin-duration": `${spinDuration ?? 4000}ms`,
        }}
      />
      <div
        className={`wheel__labels ${isSpinning ? "wheel__labels--spinning" : ""}`}
        aria-hidden="true"
      >
        <svg
          className="wheel__label-layer"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="wheelLabelShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="1.2"
                stdDeviation="1.6"
                floodColor="rgba(15, 23, 42, 0.7)"
              />
            </filter>
          </defs>
          {labels.map((item) => (
            <text
              key={item.id}
              x={item.x}
              y={item.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="wheel__label-text"
              filter="url(#wheelLabelShadow)"
              style={{ whiteSpace: "nowrap" }}
            >
              {item.label}
            </text>
          ))}
        </svg>
      </div>
      <div
        aria-hidden="true"
        className={`wheel__pointer ${
          isExtremeRound ? "wheel__pointer--extreme" : ""
        } ${showPulse ? "wheel__pointer--pulse" : ""}`}
      >
        ▼
      </div>
      {children}
    </div>
  );
};

export default Wheel;
