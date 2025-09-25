import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultPrompts } from "../config/prompts";
import "./Wheel.css";

const categories = [
  {
    key: "truthPrompts",
    label: "Truth",
    baseColor: "#f8a5a5",
    highlightColor: "#ff5d73",
    textColor: "#3b0d11",
  },
  {
    key: "darePrompts",
    label: "Dare",
    baseColor: "#f9e79f",
    highlightColor: "#f4b942",
    textColor: "#3c2f09",
  },
  {
    key: "triviaQuestions",
    label: "Trivia",
    baseColor: "#a8edea",
    highlightColor: "#4bc0c8",
    textColor: "#06393d",
  },
];

function flattenPrompts(group) {
  if (!group) {
    return [];
  }

  if (Array.isArray(group)) {
    return group;
  }

  return Object.values(group).reduce((acc, value) => {
    if (Array.isArray(value)) {
      acc.push(...value);
    }
    return acc;
  }, []);
}

const sliceSize = 360 / categories.length;
const POINTER_OFFSET = sliceSize / 2; // keep pointer centered on the active slice
const SPIN_TURNS = 4; // full rotations before easing out
const SPIN_DURATION = 3800; // ms
const SPIN_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

function relativeLuminance(hexColor) {
  if (!hexColor) {
    return 1;
  }

  let hex = hexColor.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (hex.length !== 6) {
    return 1;
  }

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const channel = (value) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const Label = React.memo(function Label({ label, wrapperStyle, textStyle }) {
  return (
    <div className="wheel__label" style={wrapperStyle}>
      <span className="wheel__label-text" style={textStyle}>
        {label}
      </span>
    </div>
  );
});

function Wheel() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const spinTimeoutRef = useRef(null);

  const wheelGradient = useMemo(() => {
    const stops = categories
      .map((category, index) => {
        const start = index * sliceSize;
        const end = (index + 1) * sliceSize;
        const color =
          selectedCategory === category.key
            ? category.highlightColor
            : category.baseColor;

        return `${color} ${start}deg ${end}deg`;
      })
      .join(", ");

    return `conic-gradient(${stops})`;
  }, [selectedCategory]);

  const labelConfigs = useMemo(() => {
    return categories.map((category, index) => {
      const angle = index * sliceSize + sliceSize / 2;
      const isActive = selectedCategory === category.key;
      const sliceColor = isActive ? category.highlightColor : category.baseColor;
      const shouldShowShadow = relativeLuminance(sliceColor) < 0.5 && !isActive;

      return {
        key: category.key,
        label: category.label,
        wrapperStyle: {
          transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(-1 * var(--label-radius)))`,
          "--label-color": isActive ? "#1f2933" : category.textColor,
          "--label-text-shadow": shouldShowShadow
            ? "0 1px 2px rgba(0,0,0,.35)"
            : "none",
          "--label-background": isActive ? "rgba(255, 255, 255, 0.82)" : "transparent",
          "--label-box-shadow": isActive ? "0 6px 20px rgba(17, 24, 39, 0.18)" : "none",
          "--label-text-rotation": `${-angle}deg`,
        },
        textStyle: undefined,
      };
    });
  }, [selectedCategory]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  const handleSpin = useCallback(() => {
    if (isSpinning) {
      return;
    }

    setIsSpinning(true);
    setSelectedCategory(null);

    const randomAngle = Math.random() * 360;
    let nextRotationValue = 0;

    setCurrentRotation((previousRotation) => {
      nextRotationValue = previousRotation + SPIN_TURNS * 360 + randomAngle;
      return nextRotationValue;
    });

    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }

    spinTimeoutRef.current = setTimeout(() => {
      const finalAngle = ((nextRotationValue % 360) + 360) % 360;
      const sliceIndex = Math.floor(finalAngle / sliceSize) % categories.length;
      const activeCategory = categories[sliceIndex];
      const prompts = flattenPrompts(defaultPrompts[activeCategory.key]);

      if (!prompts.length) {
        setSelectedPrompt("No prompts found for this category.");
        setSelectedCategory(activeCategory.key);
        setIsSpinning(false);
        return;
      }

      const prompt = prompts[Math.floor(Math.random() * prompts.length)];
      setSelectedPrompt(prompt);
      setSelectedCategory(activeCategory.key);
      setIsSpinning(false);
    }, SPIN_DURATION);
  }, [isSpinning]);

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        padding: "2rem 1rem",
      }}
    >
      <div className="wheel" aria-label="Prompt category wheel">
        <div className="wheel__pointer" aria-hidden="true" />
        <div
          className="wheel__disc"
          style={{
            background: wheelGradient,
            transform: `rotate(${currentRotation - POINTER_OFFSET}deg)`,
            transition: isSpinning
              ? `transform ${SPIN_DURATION}ms ${SPIN_EASING}`
              : undefined,
            willChange: isSpinning ? "transform" : undefined,
          }}
        >
        {labelConfigs.map(({ key, label, wrapperStyle, textStyle }) => (
          <Label
            key={key}
            label={label}
            wrapperStyle={wrapperStyle}
            textStyle={textStyle}
          />
        ))}
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            border: "3px solid #1f2933",
            position: "absolute",
          }}
        />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSpin}
        style={{
          padding: "0.6rem 1.6rem",
          borderRadius: "9999px",
          border: "none",
          backgroundColor: "#1f2933",
          color: "#ffffff",
          fontWeight: 600,
          letterSpacing: "0.05em",
          cursor: isSpinning ? "wait" : "pointer",
          opacity: isSpinning ? 0.7 : 1,
        }}
        disabled={isSpinning}
      >
        Spin
      </button>

      <div style={{ maxWidth: "360px", textAlign: "center" }}>
        {selectedPrompt ? (
          <p style={{ lineHeight: 1.5 }}>{selectedPrompt}</p>
        ) : (
          <p style={{ color: "#6b7280" }}>
            Give the wheel a spin to get your first prompt.
          </p>
        )}
      </div>
    </section>
  );
}

export default Wheel;
