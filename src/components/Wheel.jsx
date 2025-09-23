import React, { useMemo } from "react";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const CSS_VARIABLE_REGEX = /var\((--[^,\s)]+)(?:,\s*([^)]+))?\)/;

const parseHexColor = (value) => {
  const hex = value.replace("#", "").trim();
  if (hex.length === 3) {
    const r = Number.parseInt(hex[0] + hex[0], 16);
    const g = Number.parseInt(hex[1] + hex[1], 16);
    const b = Number.parseInt(hex[2] + hex[2], 16);
    if ([r, g, b].some((component) => Number.isNaN(component))) {
      return null;
    }
    return { r, g, b };
  }
  if (hex.length === 6) {
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some((component) => Number.isNaN(component))) {
      return null;
    }
    return { r, g, b };
  }
  return null;
};

const parseRgbColor = (value) => {
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) {
    return null;
  }
  const parts = match[1].split(",").map((part) => part.trim());
  if (parts.length < 3) {
    return null;
  }
  const parseChannel = (channel) => {
    if (channel.endsWith("%")) {
      const percentage = Number.parseFloat(channel.slice(0, -1));
      if (!Number.isFinite(percentage)) {
        return Number.NaN;
      }
      return clamp(Math.round((percentage / 100) * 255), 0, 255);
    }
    const numeric = Number.parseFloat(channel);
    if (!Number.isFinite(numeric)) {
      return Number.NaN;
    }
    return clamp(Math.round(numeric), 0, 255);
  };
  const r = parseChannel(parts[0]);
  const g = parseChannel(parts[1]);
  const b = parseChannel(parts[2]);
  if ([r, g, b].some((component) => Number.isNaN(component))) {
    return null;
  }
  return { r, g, b };
};

const parseColor = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("#")) {
    return parseHexColor(trimmed);
  }
  if (trimmed.toLowerCase().startsWith("rgb")) {
    return parseRgbColor(trimmed);
  }
  return null;
};

const relativeLuminance = ({ r, g, b }) => {
  const transform = (component) => {
    const normalized = component / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  const red = transform(r);
  const green = transform(g);
  const blue = transform(b);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const resolveColorValue = (input, rootStyles) => {
  if (!input || typeof input !== "string") {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(CSS_VARIABLE_REGEX);
  if (match) {
    const variableName = match[1];
    const fallback = match[2];
    const resolved = rootStyles
      ?.getPropertyValue(variableName)
      ?.trim();
    if (resolved) {
      return resolved;
    }
    if (fallback) {
      return resolveColorValue(fallback, rootStyles);
    }
    return null;
  }
  return trimmed;
};

const getSegmentLuminance = (color, rootStyles) => {
  const resolved = resolveColorValue(color, rootStyles);
  if (!resolved) {
    return null;
  }
  const rgb = parseColor(resolved);
  if (!rgb) {
    return null;
  }
  return relativeLuminance(rgb);
};

const deriveToneFromLuminance = (luminance) => {
  if (!Number.isFinite(luminance)) {
    return undefined;
  }
  return luminance >= 0.55 ? "dark" : "light";
};

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

const getLabelColorVar = (segmentId, tone, luminance) => {
  if (!tone) {
    if (!segmentId) {
      return "var(--wheel-label-default, var(--text-main, #f8fafc))";
    }
    return `var(--wheel-${segmentId}-label, var(--wheel-label-default, var(--text-main, #f8fafc)))`;
  }
  let fallbackColor;
  if (tone === "light") {
    const strength = clamp(0.9 + (0.35 - (luminance ?? 0.32)) * 0.4, 0.9, 0.995);
    fallbackColor = `rgba(248, 250, 252, ${strength.toFixed(3)})`;
  } else if (tone === "dark") {
    const strength = clamp(0.72 + ((luminance ?? 0.62) - 0.55) * 0.55, 0.72, 0.94);
    fallbackColor = `rgba(15, 23, 42, ${strength.toFixed(3)})`;
  } else {
    fallbackColor = "var(--wheel-label-default, var(--text-main, #f8fafc))";
  }
  if (!segmentId) {
    return fallbackColor;
  }
  return `var(--wheel-${segmentId}-label, ${fallbackColor})`;
};

const getLabelSurfaceVar = (segmentId, tone, luminance) => {
  let fallback;
  if (tone === "light") {
    const opacity = clamp(0.42 + (0.3 - (luminance ?? 0.28)) * 0.5, 0.34, 0.62);
    fallback = `rgba(15, 23, 42, ${opacity.toFixed(3)})`;
  } else if (tone === "dark") {
    const opacity = clamp(0.2 + ((luminance ?? 0.6) - 0.55) * 0.45, 0.18, 0.4);
    fallback = `rgba(248, 250, 252, ${opacity.toFixed(3)})`;
  } else {
    fallback = "rgba(15, 23, 42, 0.45)";
  }
  if (!segmentId) {
    return fallback;
  }
  return `var(--wheel-${segmentId}-label-surface, ${fallback})`;
};

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
    const rootStyles =
      typeof window !== "undefined" && typeof document !== "undefined"
        ? getComputedStyle(document.documentElement)
        : null;
    const radiansOffset = -90 * (Math.PI / 180);
    const sliceAngleRadians = (sliceAngle * Math.PI) / 180;
    const baseCircleRadius = 48; // matches the wheel radius minus border padding

    return segments.map((segment, index) => {
      const id = segment.id ?? segment.label ?? index;
      const label =
        segment.label ?? segment.title ?? segment.id ?? `Segment ${index + 1}`;
      const midpointDeg = index * sliceAngle + sliceAngle / 2;
      const radians = midpointDeg * (Math.PI / 180) + radiansOffset;
      const typography = deriveLabelTypography(sliceAngle, label);
      const centroidRadiusNumerator = 4 * Math.sin(sliceAngleRadians / 2);
      const centroidRadiusDenominator =
        3 * (sliceAngleRadians || Number.EPSILON);
      const centroidRadius =
        (baseCircleRadius * centroidRadiusNumerator) /
        centroidRadiusDenominator;
      const textRadius = clamp(
        centroidRadius *
          (typography.lineClamp > 1 || typography.longestWordLength > 8
            ? 0.98
            : 1.04),
        baseCircleRadius * 0.54,
        baseCircleRadius * 1.04,
      );
      const x = 50 + textRadius * Math.cos(radians);
      const y = 50 + textRadius * Math.sin(radians);
      const arcWidth = 2 * textRadius * Math.sin(sliceAngleRadians / 2);
      const width = clamp(
        arcWidth * (typography.lineClamp > 1 ? 0.94 : 0.86),
        22,
        segments.length <= 2 ? 72 : 60,
      );
      const luminance = getSegmentLuminance(segment.color, rootStyles);
      const toneOverrides = {
        truth: "dark",
        dare: "light",
        trivia: "dark",
      };
      const tone =
        segment.labelTone ??
        toneOverrides[segment.id] ??
        deriveToneFromLuminance(luminance);
      const explicitColor = segment.labelColor
        ? resolveColorValue(segment.labelColor, rootStyles) ?? segment.labelColor
        : undefined;
      const explicitSurface = segment.labelSurface
        ? resolveColorValue(segment.labelSurface, rootStyles) ?? segment.labelSurface
        : undefined;
      const color = explicitColor ?? getLabelColorVar(segment.id, tone, luminance);
      const surface = explicitSurface ?? getLabelSurfaceVar(segment.id, tone, luminance);

      return {
        id,
        label,
        x,
        y,
        width,
        color,
        surface,
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
    if (meterProgress >= 60) {
      return "wheel-meter--spicy";
    }
    return "wheel-meter--normal";
  }, [meterProgress]);

  const meterPulseClass = useMemo(() => {
    if (meterProgress >= 95) {
      return "wheel-meter--pulse-strong";
    }
    if (meterProgress >= 75) {
      return "wheel-meter--pulse-medium";
    }
    if (meterProgress >= 40) {
      return "wheel-meter--pulse-soft";
    }
    return "";
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
        className={`wheel-meter ${meterStateClass} ${meterPulseClass}`.trim()}
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
                background: item.surface,
              }}
            >
              <span
                className="wheel__label-text wheel-label"
                style={{
                  fontSize: item.fontSize,
                  letterSpacing: item.letterSpacing,
                  lineHeight: item.lineHeight,
                  WebkitLineClamp: item.lineClamp,
                  lineClamp: item.lineClamp,
                  "--wheel-label-lines": item.lineClamp,
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
