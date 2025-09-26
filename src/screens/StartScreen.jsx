import React, { memo } from "react";

const StartScreen = memo(({ onPickMode }) => (
  <div className="screen">
    <div
      className="glass"
      style={{
        width: "min(92vw, 560px)",
        borderRadius: 26,
        padding: 28,
        textAlign: "center",
      }}
    >
      <h1
        className="brand-title animate-in"
        style={{ fontSize: 46, margin: "0 0 8px" }}
      >
        Date Night
      </h1>
      <p
        className="animate-in delay-1"
        style={{ opacity: 0.86, fontSize: 18, margin: "0 0 22px" }}
      >
        Pick your vibe to get started.
      </p>
      <div style={{ display: "grid", gap: 12 }}>
        <button
          className="x-btn btn grad-pink animate-in delay-2"
          onClick={() => onPickMode("together")}
        >
          Together
        </button>
        <button
          className="x-btn btn grad-neon animate-in delay-3"
          onClick={() => onPickMode("multiplayer")}
        >
          Multiplayer
        </button>
        <button
          className="x-btn btn grad-aurora animate-in delay-4"
          onClick={() => onPickMode("offline")}
        >
          Offline
        </button>
      </div>
    </div>
  </div>
));

export default StartScreen;
