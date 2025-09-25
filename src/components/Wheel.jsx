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

const Pointer = React.memo(function Pointer() {
  return <div className="wheel__pointer" aria-hidden="true" />;
});

function Wheel({ extremeOnly = false }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const spinTimeoutRef = useRef(null);
  const rotationRef = useRef(0);

  const availableCategories = useMemo(() => {
    if (!extremeOnly) {
      return categories;
    }

    return categories.filter((category) => category.key !== "triviaQuestions");
  }, [extremeOnly]);

  const visibleSliceCount = availableCategories.length;

  const sliceAngle = useMemo(() => {
    if (visibleSliceCount === 0) {
      return 0;
    }

    return 360 / visibleSliceCount;
  }, [visibleSliceCount]);

  const wheelGradient = useMemo(() => {
    if (!sliceAngle) {
      return "transparent";
    }

    const stops = availableCategories
      .map((category, index) => {
        const start = index * sliceAngle;
        const end = (index + 1) * sliceAngle;
        const color =
          selectedCategory === category.key
            ? category.highlightColor
            : category.baseColor;

        return `${color} ${start}deg ${end}deg`;
      })
      .join(", ");

    return `conic-gradient(${stops})`;
  }, [availableCategories, sliceAngle, selectedCategory]);

  const labelConfigs = useMemo(() => {
    if (!sliceAngle) {
      return [];
    }

    return availableCategories.map((category, index) => {
      const rotation = index * sliceAngle + sliceAngle / 2;
      const isActive = selectedCategory === category.key;
      const sliceColor = isActive ? category.highlightColor : category.baseColor;
      const shouldShowShadow = relativeLuminance(sliceColor) < 0.5;

      return {
        key: category.key,
        label: category.label,
        wrapperStyle: {
          transform: `translate(-50%, -50%) rotate(${rotation}deg) translateY(calc(-1 * var(--labelRadius, 60%)))`,
          "--label-color": isActive
            ? "#1f2933"
            : category.textColor || undefined,
        },
        textStyle: {
          "--label-text-rotation": `${rotation}deg`,
          textShadow: shouldShowShadow ? "0 1px 2px rgba(0,0,0,.35)" : "none",
        },
      };
    });
  }, [availableCategories, selectedCategory, sliceAngle]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      selectedCategory &&
      !availableCategories.some((category) => category.key === selectedCategory)
    ) {
      setSelectedCategory(null);
    }
  }, [availableCategories, selectedCategory]);

  const handleSpin = useCallback(() => {
    if (isSpinning || visibleSliceCount === 0 || !sliceAngle) {
      return;
    }

    setIsSpinning(true);
    setSelectedCategory(null);
    setSelectedPrompt("");

    const randomAngle = Math.random() * 360;
    const anglePerSlice = sliceAngle;
    const categorySnapshot = availableCategories;
    const baseRotation = rotationRef.current;
    const targetRotation = baseRotation + SPIN_TURNS * 360 + randomAngle;

    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }

    requestAnimationFrame(() => {
      rotationRef.current = targetRotation;
      setCurrentRotation(targetRotation);
    });

    spinTimeoutRef.current = setTimeout(() => {
      const finalAngle = ((targetRotation % 360) + 360) % 360;
      const sliceIndex = Math.floor(finalAngle / anglePerSlice) % categorySnapshot.length;
      const activeCategory = categorySnapshot[sliceIndex];
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
  }, [availableCategories, isSpinning, sliceAngle, visibleSliceCount]);

  useEffect(() => {
    rotationRef.current = currentRotation;
  }, [currentRotation]);

  useEffect(() => {
    setSelectedCategory(null);
    setSelectedPrompt("");
  }, [extremeOnly]);

  return (
    <section className="wheel-module" aria-label="Prompt wheel module">
      <div className="wheel" aria-label="Prompt category wheel">
        <Pointer />
        <div
          className="wheel__disc"
          style={{
            background: wheelGradient,
            transform: `rotate(${currentRotation}deg)`,
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
          <div className="wheel__hub" />
        </div>
      </div>

      <div className="wheel__actions">
        <button
          type="button"
          className="wheel__spin-button"
          onClick={handleSpin}
          disabled={isSpinning}
        >
          {isSpinning ? "Spinning…" : "Spin"}
        </button>
        <p className="wheel__mode" aria-live="polite">
          Mode: {extremeOnly ? "Extreme (Truth & Dare)" : "Classic (Truth, Dare, Trivia)"}
        </p>
        <div className="wheel__prompt" aria-live="polite">
          {selectedPrompt ? (
            <p>{selectedPrompt}</p>
          ) : (
            <p>Give the wheel a spin to get your first prompt.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default Wheel;
