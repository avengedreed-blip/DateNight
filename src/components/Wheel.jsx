import React, { useMemo } from "react";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const responsiveFontSize = (sliceAngle, normalizedLength, longestWordLength) => {
  const angleFactor = clamp(0.92 + (sliceAngle / 160) * 0.58, 0.74, 1.28);
  const lengthPenalty = clamp(1.18 - normalizedLength * 0.036, 0.6, 1.02);
  const longWordPenalty = clamp(1.08 - Math.max(0, longestWordLength - 7) * 0.038, 0.7, 1);
  const adjusted = angleFactor * lengthPenalty * longWordPenalty;
  const minRem = (adjusted * 0.7).toFixed(3);
  const idealRem = (adjusted * 0.84).toFixed(3);
  const maxRem = (adjusted * 1.02).toFixed(3);
  const vwComponent = clamp(sliceAngle * 0.012, 0.3, 1.32).toFixed(3);
  return `clamp(${minRem}rem, calc(${idealRem}rem + ${vwComponent}vw), ${maxRem}rem)`;
};

const deriveLabelTypography = (sliceAngle, label) => {
  const sanitizedLabel = `${label ?? ""}`.replace(/\s+/g, " ").trim();
  const normalizedLength = Math.max(sanitizedLabel.replace(/\s+/g, "").length, 4);
  const words = sanitizedLabel.length ? sanitizedLabel.split(" ") : [];
  const longestWordLength = words.reduce(
    (max, word) => Math.max(max, word.length),
    0,
  );
  const fontSize = responsiveFontSize(sliceAngle, normalizedLength, longestWordLength);
  const allowMultiLine = normalizedLength > 10 || longestWordLength > 8 || words.length >= 3;
  const allowThreeLines = normalizedLength > 18 || words.length >= 4 || longestWordLength > 11;
  const lineClamp = allowThreeLines ? 3 : allowMultiLine ? 2 : 1;
  const baseLetterSpacing = clamp(0.16 - normalizedLength * 0.0028, 0.05, 0.14);
  const letterSpacing = `${baseLetterSpacing.toFixed(3)}em`;
  const lineHeight = Number(
    ((allowMultiLine ? 1.16 : 1.08) - (longestWordLength > 12 ? 0.02 : 0)).toFixed(2),
  );

  return {
    fontSize,
    normalizedLength,
    longestWordLength,
    lineClamp,
    letterSpacing,
    lineHeight,
  };
};

const PURE_WHITE = "#FFFFFF";

const getLabelColor = () => PURE_WHITE;

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
    const sliceAngleRadians = (sliceAngle * Math.PI) / 180;
    const radiusRatioBase = segments.length <= 2
      ? 0.68
      : clamp(0.57 + (sliceAngle / 360) * 0.22, 0.55, 0.68);
    const baseRadius = 50 * radiusRatioBase;

    return segments.map((segment, index) => {
      const id = segment.id ?? segment.label ?? index;
      const label =
        segment.label ?? segment.title ?? segment.id ?? `Segment ${index + 1}`;
      const midpointDeg = index * sliceAngle + sliceAngle / 2;
      const radians = midpointDeg * (Math.PI / 180) + radiansOffset;
      const typography = deriveLabelTypography(sliceAngle, label);
      const radiusAdjustment = clamp(
        1 - Math.max(0, typography.normalizedLength - 6) * 0.008,
        0.84,
        0.97,
      );
      const radius = baseRadius * radiusAdjustment;
      const x = 50 + radius * Math.cos(radians);
      const y = 50 + radius * Math.sin(radians);
      const arcWidth = 2 * radius * Math.sin(sliceAngleRadians / 2);
      const width = clamp(
        arcWidth * (typography.lineClamp > 1 ? 0.96 : 0.9),
        24,
        segments.length <= 2 ? 70 : 58,
      );
      const color = getLabelColor();

      return {
        id,
        label,
        x,
        y,
        width,
        color,
        fontSize: typography.fontSize,
        lineClamp: typography.lineClamp,
        letterSpacing: typography.letterSpacing,
        lineHeight: typography.lineHeight,
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
                style={{
                  fontSize: item.fontSize,
                  letterSpacing: item.letterSpacing,
                  lineHeight: item.lineHeight,
                }}
              >
                <span
                  className="wheel__label-text-inner"
                  style={{
                    WebkitLineClamp: item.lineClamp,
                    lineClamp: item.lineClamp,
                  }}
                >
                  {item.label}
                </span>
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
