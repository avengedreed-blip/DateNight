import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultPrompts } from "../config/prompts";
import "./Wheel.css";

const categories = [
  {
    key: "truthPrompts",
    label: "Truth",
    colorVar: "--truth",
  },
  {
    key: "darePrompts",
    label: "Dare",
    colorVar: "--dare",
  },
  {
    key: "triviaQuestions",
    label: "Trivia",
    colorVar: "--trivia",
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

const SPIN_TURNS = 4;
const SPIN_DURATION = 3800;
const SPIN_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const Label = React.memo(function Label({ label, wrapperStyle, textStyle, sliceKey, isActive }) {
  return (
    <div className="wheel__label" style={wrapperStyle} data-slice={sliceKey} data-active={isActive ? "true" : undefined}>
      <span className="wheel__label-text" style={textStyle}>
        {label}
      </span>
    </div>
  );
});

const Pointer = React.memo(function Pointer() {
  return <div className="wheel__pointer" aria-hidden="true" />;
});

const SeparatorOverlay = React.memo(function SeparatorOverlay({ count }) {
  const lines = useMemo(() => {
    if (!count || count < 2) {
      return [];
    }

    const radius = 47;

    return Array.from({ length: count }, (_, index) => {
      const angle = (index * 360) / count;
      const radians = ((angle - 90) * Math.PI) / 180;
      const x = 50 + radius * Math.cos(radians);
      const y = 50 + radius * Math.sin(radians);

      return {
        key: angle,
        x: Number(x.toFixed(3)),
        y: Number(y.toFixed(3)),
      };
    });
  }, [count]);

  if (lines.length === 0) {
    return null;
  }

  return (
    <svg className="wheel__separators" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {lines.map(({ key, x, y }) => (
        <line key={key} x1="50" y1="50" x2={x} y2={y} />
      ))}
    </svg>
  );
});

const POINTER_APEX_OFFSET = 0;

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
    if (!sliceAngle || visibleSliceCount === 0) {
      return "transparent";
    }

    const stops = availableCategories
      .map((category, index) => {
        const start = index * sliceAngle;
        const end = (index + 1) * sliceAngle;
        const baseColor = `var(${category.colorVar})`;
        const color =
          selectedCategory === category.key
            ? `color-mix(in srgb, ${baseColor} 72%, white 28%)`
            : baseColor;

        return `${color} ${start}deg ${end}deg`;
      })
      .join(", ");

    return `conic-gradient(${stops})`;
  }, [availableCategories, selectedCategory, sliceAngle, visibleSliceCount]);

  const labelConfigs = useMemo(() => {
    if (!sliceAngle) {
      return [];
    }

    return availableCategories.map((category, index) => {
      const rotation = index * sliceAngle + sliceAngle / 2;
      const isActive = selectedCategory === category.key;

      return {
        key: category.key,
        label: category.label,
        sliceKey: category.key,
        isActive,
        wrapperStyle: {
          transform: `translate(-50%, -50%) rotate(${rotation}deg) translateY(calc(-1 * var(--labelRadius)))`,
        },
        textStyle: {
          transform: `rotate(${-rotation}deg)`,
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
      const normalizedRotation = ((targetRotation % 360) + 360) % 360;
      const pointerAngle = (360 - normalizedRotation + POINTER_APEX_OFFSET + 360) % 360;
      const sliceIndex = Math.floor(pointerAngle / anglePerSlice) % categorySnapshot.length;
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

  const discStyle = useMemo(() => {
    const baseStyle = {
      "--wheel-slices": wheelGradient,
      transform: `rotate(${currentRotation}deg)`,
    };

    if (isSpinning) {
      baseStyle.transition = `transform ${SPIN_DURATION}ms ${SPIN_EASING}`;
      baseStyle.willChange = "transform";
    }

    return baseStyle;
  }, [currentRotation, isSpinning, wheelGradient]);

  return (
    <section className="wheel-module" aria-label="Prompt wheel module">
      <div className="wheel" aria-label="Prompt category wheel">
        <Pointer />
        <div
          className="wheel__disc"
          style={discStyle}
          data-slice-count={visibleSliceCount || undefined}
        >
          <SeparatorOverlay count={visibleSliceCount} />
          {labelConfigs.map(({ key, label, wrapperStyle, textStyle, sliceKey, isActive }) => (
            <Label
              key={key}
              label={label}
              wrapperStyle={wrapperStyle}
              textStyle={textStyle}
              sliceKey={sliceKey}
              isActive={isActive}
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
