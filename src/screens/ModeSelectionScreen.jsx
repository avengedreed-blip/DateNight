import React, { useState, memo } from "react";

const ModeSelectionScreen = memo(({ mode, onStart }) => {
  const [type, setType] = useState("couples");
  const [players, setPlayers] = useState(3);
  const title = mode ? `${mode[0].toUpperCase() + mode.slice(1)} Mode` : "Choose Mode";

  return (
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
        <h2
          className="brand-title animate-in"
          style={{ fontSize: 36, margin: "0 0 18px" }}
        >
          {title}
        </h2>
        <div
          className="animate-in delay-1"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            padding: 6,
            borderRadius: 12,
            background: "rgba(255,255,255,.06)",
          }}
        >
          <button
            className="btn"
            style={{
              borderRadius: 10,
              background: type === "couples" ? "rgba(255,255,255,.9)" : "transparent",
              color: type === "couples" ? "#000" : "var(--text)",
            }}
            onClick={() => setType("couples")}
          >
            Couples
          </button>
          <button
            className="btn"
            style={{
              borderRadius: 10,
              background: type === "party" ? "rgba(255,255,255,.9)" : "transparent",
              color: type === "party" ? "#000" : "var(--text)",
            }}
            onClick={() => setType("party")}
          >
            Party
          </button>
        </div>

        {type === "party" && (
          <div
            className="animate-in delay-2"
            style={{ textAlign: "left", margin: "14px 0 6px" }}
          >
            <label htmlFor="players" style={{ fontWeight: 800 }}>
              Players: {players}
            </label>
            <input
              id="players"
              type="range"
              min="3"
              max="8"
              value={players}
              onChange={(e) => setPlayers(parseInt(e.target.value, 10))}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>
        )}
        <button
          className="x-btn btn grad-neon animate-in delay-3"
          style={{ marginTop: 10 }}
          onClick={() => onStart({ groupType: type, players })}
        >
          Start Game
        </button>
      </div>
    </div>
  );
});

export default ModeSelectionScreen;
