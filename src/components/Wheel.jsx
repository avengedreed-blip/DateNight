import React, { useMemo, useState } from "react";
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

function Wheel() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPrompt, setSelectedPrompt] = useState("");

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

  const handleSpin = () => {
    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)];
    const prompts = flattenPrompts(defaultPrompts[randomCategory.key]);

    if (!prompts.length) {
      setSelectedPrompt("No prompts found for this category.");
      setSelectedCategory(randomCategory.key);
      return;
    }

    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    setSelectedCategory(randomCategory.key);
    setSelectedPrompt(prompt);
  };

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
      <div
        style={{
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          background: wheelGradient,
          position: "relative",
          boxShadow: "0 0 0 8px rgba(0, 0, 0, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Prompt category wheel"
      >
        {categories.map((category, index) => {
          const angle = index * sliceSize + sliceSize / 2;
          const isActive = selectedCategory === category.key;
          const labelOffset = 104;

          return (
            <div
              key={category.key}
              className="wheel__label"
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${labelOffset}px)`,
                width: "50%",
                maxWidth: "9rem",
                "--label-color": isActive
                  ? "#1f2933"
                  : category.textColor,
              }}
            >
              <span
                className="wheel__label-text"
                style={{
                  transform: `rotate(-${angle}deg)`,
                  backgroundColor: isActive
                    ? "rgba(255, 255, 255, 0.7)"
                    : "transparent",
                  boxShadow: isActive
                    ? "0 6px 20px rgba(17, 24, 39, 0.18)"
                    : "none",
                }}
              >
                {category.label}
              </span>
            </div>
          );
        })}
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
          cursor: "pointer",
        }}
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
