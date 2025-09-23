import React, { useMemo } from "react";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const responsiveFontSize = (sliceAngle, normalizedLength) => {
  const base = 0.82 + (sliceAngle / 150) * 0.55;
  const lengthAdjustment = clamp(1.1 - normalizedLength * 0.04, 0.64, 1.08);
  const adjusted = base * lengthAdjustment;
  const minRem = (adjusted * 0.72).toFixed(3);
  const idealRem = (adjusted * 0.85).toFixed(3);
  const maxRem = (adjusted * 1.05).toFixed(3);
  const vwComponent = clamp(sliceAngle * 0.012, 0.28, 1.4).toFixed(3);
  return `clamp(${minRem}rem, calc(${idealRem}rem + ${vwComponent}vw), ${maxRem}rem)`;
};

const getLabelColorVar = (segmentId) =>
  segmentId
    ? `var(--wheel-${segmentId}-label, var(--wheel-label-default, var(--text-main, #f8fafc)))`
    : `var(--wheel-label-default, var(--text-main, #f8fafc))`;

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
  extremeMeter = 0,
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
    if (!Number.isFinite(value)) {
      return 0;
    }
    return value < 0 ? value + 360 : value;
  }, [rotation]);

  const labels = useMemo(() => {
    if (!segments?.length) {
      return [];
    }

    const sliceAngle = 360 / segments.length;
    const radiansOffset = -90 * (Math.PI / 180);
    const radius = clamp(40 + sliceAngle * 0.06, 42, segments.length <= 2 ? 47 : 45);

    return segments.map((segment, index) => {
      const id = segment.id ?? segment.label ?? index;
      const label =
        segment.label ?? segment.title ?? segment.id ?? `Segment ${index + 1}`;
      const midpointDeg = index * sliceAngle + sliceAngle / 2;
      const radians = midpointDeg * (Math.PI / 180) + radiansOffset;
      const x = 50 + radius * Math.cos(radians);
      const y = 50 + radius * Math.sin(radians);
      const normalizedLength = Math.max(label.replace(/\s+/g, "").length, 4);
      const fontSize = responsiveFontSize(sliceAngle, normalizedLength);
      const width = clamp(sliceAngle * 0.42, 30, segments.length <= 2 ? 64 : 58);
      const color = getLabelColorVar(segment.id);

      return {
        id,
        label,
        x,
        y,
        width,
        fontSize,
        color,
      };
    });
  }, [segments]);

  const meterProgress = useMemo(() => {
    const numericValue = Number.isFinite(extremeMeter)
      ? extremeMeter
      : Number.parseFloat(extremeMeter);
    if (!Number.isFinite(numericValue)) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.round(numericValue)));
  }, [extremeMeter]);

  const meterStateClass = useMemo(() => {
    if (meterProgress >= 100) {
      return "wheel-meter--full";
    }
    if (meterProgress >= 50) {
      return "wheel-meter--spicy";
    }
    return "wheel-meter--normal";
  }, [meterProgress]);

  const meterCircumference = 2 * Math.PI * 54;

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
        className={`wheel-meter ${meterStateClass}`}
        aria-hidden="true"
      >
        <svg className="wheel-meter__svg" viewBox="0 0 120 120">
          <circle className="wheel-meter__ring" cx="60" cy="60" r="54" />
          <circle
            className="wheel-meter__progress"
            cx="60"
            cy="60"
            r="54"
            style={{
              strokeDasharray: meterCircumference,
              strokeDashoffset:
                meterCircumference -
                (meterCircumference * meterProgress) / 100,
            }}
          />
        </svg>
      </div>
      <div className="wheel-meter__caption" aria-hidden="true">
        <span className="wheel-meter__caption-label">Extreme Meter</span>
        <span className="wheel-meter__caption-value">{meterProgress}%</span>
      </div>
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
                color: item.color,
              }}
            >
              <span
                className="wheel__label-text wheel-label"
                style={{ fontSize: item.fontSize }}
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
