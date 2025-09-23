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

  const normalizedRotation = useMemo(() => {
    if (!Number.isFinite(rotation)) {
      return 0;
    }
    const value = rotation % 360;
    return Number.isFinite(value) ? value : 0;
  }, [rotation]);

  const labels = useMemo(() => {
    if (!segments?.length) {
      return [];
    }

    const sliceAngle = 360 / segments.length;
    const radiansOffset = -90 * (Math.PI / 180);
    const radius = Math.max(30, Math.min(42, 30 + sliceAngle * 0.09));
    const baseWidth = Math.min(68, Math.max(46, sliceAngle * 0.4));

    return segments.map((segment, index) => {
      const id = segment.id ?? segment.label ?? index;
      const label =
        segment.label ?? segment.title ?? segment.id ?? `Segment ${index + 1}`;
      const midpointDeg = index * sliceAngle + sliceAngle / 2;
      const radians = midpointDeg * (Math.PI / 180) + radiansOffset;
      const x = 50 + radius * Math.cos(radians);
      const y = 50 + radius * Math.sin(radians);
      const normalizedLength = Math.max(label.replace(/\s+/g, "").length, 4);
      const lengthScale = Math.min(1.25, Math.max(0.68, 14 / normalizedLength));
      const angleScale = Math.min(1.4, Math.max(0.75, sliceAngle / 110));
      const fontSize = Number.parseFloat(
        (1.05 * angleScale * lengthScale).toFixed(3)
      );

      return {
        id,
        label,
        x,
        y,
        width: baseWidth,
        fontSize,
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
      >
        <div
          className={`wheel__labels ${
            isSpinning ? "wheel__labels--spinning" : ""
          }`}
          aria-hidden="true"
        >
          {labels.map((item) => (
            <div
              key={item.id}
              className="wheel__label"
              style={{
                top: `${item.y}%`,
                left: `${item.x}%`,
                width: `${item.width}%`,
                transform: `translate(-50%, -50%) rotate(${-normalizedRotation}deg)`,
              }}
            >
              <span
                className="wheel__label-text"
                style={{ fontSize: `${item.fontSize}rem` }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
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
