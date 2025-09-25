import React, { useMemo } from "react";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const colorVarCache = typeof Map !== "undefined" ? new Map() : undefined;

const cssVarPattern = /^var\((--[^,\s)]+)(?:,\s*([^)]*))?\)$/;

const resolveCssValue = (token) => {
  if (!token || typeof token !== "string") {
    return null;
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(cssVarPattern);
  if (!match) {
    return trimmed;
  }

  if (typeof window === "undefined") {
    return match[2]?.trim() ?? null;
  }

  const [, varName, fallback] = match;
  const cached = colorVarCache?.get(varName);
  if (cached) {
    return cached;
  }

  const resolved =
    getComputedStyle(document.documentElement).getPropertyValue(varName)?.trim() ||
    fallback?.trim() ||
    null;

  if (resolved) {
    colorVarCache?.set(varName, resolved);
  }

  return resolved;
};

const clamp01 = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
};

const parseHexColor = (input) => {
  if (!input || typeof input !== "string") {
    return null;
  }
  const hex = input.replace("#", "").trim();
  if (!(hex.length === 3 || hex.length === 6 || hex.length === 8)) {
    return null;
  }

  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex.slice(0, 6);

  const intVal = Number.parseInt(normalized, 16);
  if (!Number.isFinite(intVal)) {
    return null;
  }

  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
};

const parseRgbComponent = (component) => {
  if (typeof component !== "string") {
    return null;
  }
  const value = component.trim();
  if (!value) {
    return null;
  }
  if (value.endsWith("%")) {
    const percentage = Number.parseFloat(value.slice(0, -1));
    if (!Number.isFinite(percentage)) {
      return null;
    }
    return clamp(Math.round((percentage / 100) * 255), 0, 255);
  }
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return clamp(Math.round(numeric), 0, 255);
};

const parseRgbColor = (input) => {
  const match = input.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) {
    return null;
  }
  const parts = match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) {
    return null;
  }
  const r = parseRgbComponent(parts[0]);
  const g = parseRgbComponent(parts[1]);
  const b = parseRgbComponent(parts[2]);
  if (
    r === null ||
    g === null ||
    b === null
  ) {
    return null;
  }
  return { r, g, b };
};

const parseHslColor = (input) => {
  const match = input.match(/^hsla?\(([^)]+)\)$/i);
  if (!match) {
    return null;
  }
  const parts = match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) {
    return null;
  }

  const h = Number.parseFloat(parts[0]);
  const sRaw = parts[1];
  const lRaw = parts[2];
  if (!Number.isFinite(h)) {
    return null;
  }

  const toFraction = (raw) => {
    if (typeof raw !== "string") {
      return null;
    }
    const value = raw.trim();
    if (value.endsWith("%")) {
      const numeric = Number.parseFloat(value.slice(0, -1));
      if (!Number.isFinite(numeric)) {
        return null;
      }
      return clamp01(numeric / 100);
    }
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return clamp01(numeric);
  };

  const s = toFraction(sRaw);
  const l = toFraction(lRaw);
  if (s === null || l === null) {
    return null;
  }

  const hue = ((h % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = hue / 60;
  const x = chroma * (1 - Math.abs((hPrime % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r1 = chroma;
    g1 = x;
  } else if (hPrime >= 1 && hPrime < 2) {
    r1 = x;
    g1 = chroma;
  } else if (hPrime >= 2 && hPrime < 3) {
    g1 = chroma;
    b1 = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    g1 = x;
    b1 = chroma;
  } else if (hPrime >= 4 && hPrime < 5) {
    r1 = x;
    b1 = chroma;
  } else if (hPrime >= 5 && hPrime < 6) {
    r1 = chroma;
    b1 = x;
  }

  const m = l - chroma / 2;

  return {
    r: clamp(Math.round((r1 + m) * 255), 0, 255),
    g: clamp(Math.round((g1 + m) * 255), 0, 255),
    b: clamp(Math.round((b1 + m) * 255), 0, 255),
  };
};

const toRgb = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return (
    parseHexColor(trimmed) ??
    parseRgbColor(trimmed) ??
    parseHslColor(trimmed)
  );
};

const relativeLuminance = (value) => {
  const resolved = resolveCssValue(value);
  const rgb = toRgb(resolved ?? value);
  if (!rgb) {
    return null;
  }

  const transform = (channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const r = transform(rgb.r);
  const g = transform(rgb.g);
  const b = transform(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const responsiveFontSize = (
  sliceAngle,
  normalizedLength,
  longestWordLength
) => {
  const angleFactor = clamp(0.92 + (sliceAngle / 160) * 0.58, 0.74, 1.28);
  const lengthPenalty = clamp(1.18 - normalizedLength * 0.036, 0.6, 1.02);
  const longWordPenalty = clamp(
    1.08 - Math.max(0, longestWordLength - 7) * 0.038,
    0.7,
    1
  );
  const adjusted = angleFactor * lengthPenalty * longWordPenalty;

  const minRem = adjusted * 0.7;
  const idealRem = adjusted * 0.84;
  const maxRem = adjusted * 1.02;
  const minPx = Math.max(14, Math.round(minRem * 16 * 100) / 100);
  const idealPx = Math.min(28, Math.max(14, Math.round(idealRem * 16 * 100) / 100));
  const maxPx = Math.max(minPx, Math.round(Math.min(28, maxRem * 16) * 100) / 100);
  const vwComponent = clamp(sliceAngle * 0.012, 0.3, 1.32).toFixed(3);

  return `clamp(${minPx.toFixed(2)}px, calc(${idealPx.toFixed(2)}px + ${vwComponent}vw), ${Math.max(
    maxPx,
    14,
  ).toFixed(2)}px)`;
};

const deriveLabelTypography = (sliceAngle, label) => {
  const sanitizedLabel = `${label ?? ""}`.replace(/\s+/g, " ").trim();
  const normalizedLength = Math.max(
    sanitizedLabel.replace(/\s+/g, "").length,
    4
  );
  const words = sanitizedLabel.length ? sanitizedLabel.split(" ") : [];
  const longestWordLength = words.reduce(
    (max, word) => Math.max(max, word.length),
    0
  );
  const fontSize = responsiveFontSize(
    sliceAngle,
    normalizedLength,
    longestWordLength
  );
  const allowMultiLine =
    normalizedLength > 10 || longestWordLength > 8 || words.length >= 3;
  const allowThreeLines =
    normalizedLength > 18 || words.length >= 4 || longestWordLength > 11;
  const lineClamp = allowThreeLines ? 3 : allowMultiLine ? 2 : 1;
  const baseLetterSpacing = clamp(0.16 - normalizedLength * 0.0028, 0.05, 0.14);
  const letterSpacing = `${baseLetterSpacing.toFixed(3)}em`;
  const lineHeight = Number(
    (
      (allowMultiLine ? 1.16 : 1.08) - (longestWordLength > 12 ? 0.02 : 0)
    ).toFixed(2)
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

    const categories = segments.filter((segment) => segment);
    if (!categories.length) {
      return [];
    }

    const extremeOnlyMode = categories.some((segment) => {
      if (!segment) {
        return false;
      }

      if (segment.extremeOnly === true) {
        return true;
      }

      if (typeof segment.mode === "string") {
        return segment.mode === "extreme-only";
      }

      if (Array.isArray(segment.modes)) {
        return segment.modes.includes("extreme-only");
      }

      return false;
    });

    const visibleCategoriesBase = extremeOnlyMode
      ? categories.filter((segment) => {
          const identifier = (segment?.id ?? segment?.label ?? "")
            .toString()
            .trim()
            .toLowerCase();
          return identifier !== "trivia";
        })
      : categories;

    const visibleCategories =
      visibleCategoriesBase.length > 0 ? visibleCategoriesBase : categories;

    if (!visibleCategories.length) {
      return [];
    }

    const sliceAngle = 360 / visibleCategories.length;

    return visibleCategories.map((segment, index) => {
      const id = segment?.id ?? segment?.label ?? index;
      const label =
        segment?.label ?? segment?.title ?? segment?.id ?? `Segment ${index + 1}`;
      const midpointDeg = index * sliceAngle + sliceAngle / 2;
      const typography = deriveLabelTypography(sliceAngle, label);
      const sliceColorToken =
        (typeof segment?.color === "string" && segment.color) ||
        (typeof segment?.background === "string" && segment.background) ||
        (typeof segment?.fill === "string" && segment.fill) ||
        null;
      const luminanceValue =
        relativeLuminance(sliceColorToken) ??
        relativeLuminance(segment?.labelColor ?? null);
      const needsShadow = typeof luminanceValue === "number" ? luminanceValue < 0.5 : false;
      const shadowStrength = needsShadow ? 0.38 : 0;

      return {
        id,
        label,
        midpointDeg,
        color: segment?.labelColor ?? "#FFFFFF",
        lineClamp: Math.min(2, typography.lineClamp),
        lineHeight: typography.lineHeight,
        luminance: luminanceValue,
        shadowStrength,
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
      <div className={`wheel-meter ${meterStateClass}`} aria-hidden="true">
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
                meterCircumference - (meterCircumference * meterProgress) / 100,
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
          {labels.map((item) => {
            const totalAngle = item.midpointDeg + normalizedRotation;

            return (
              <div
                key={item.id}
                className="wheel__label"
                style={{
                  transform: `rotate(${totalAngle}deg) translateY(-60%)`,
                  transformOrigin: "center",
                  width: "min(58%, 320px)",
                  color: "var(--label-color, #fff)",
                  "--slice-luminance":
                    typeof item.luminance === "number" ? item.luminance : undefined,
                }}
              >
                <span
                  className="wheel__label-text wheel-label"
                  style={{
                    transform: `rotate(${-totalAngle}deg)`,
                    lineHeight: item.lineHeight,
                    "--label-shadow-strength": item.shadowStrength,
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
            );
          })}
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
