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

  const labels = useMemo(
    () =>
      segments?.map((segment, index) => ({
        id: segment.id ?? segment.label ?? index,
        label:
          segment.label ?? segment.title ?? segment.id ?? `Segment ${index + 1}`,
        angle: (index * 360) / segments.length + 180 / segments.length,
      })) ?? [],
    [segments]
  );

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
        <div className="wheel__labels" aria-hidden="true">
          {labels.map((item) => (
            <span
              key={item.id}
              className="wheel__label"
              style={{
                transform: `translate(-50%, -50%) rotate(${item.angle}deg) translateY(calc(-1 * var(--label-radius))) rotate(-${item.angle}deg)`,
              }}
            >
              {item.label}
            </span>
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
