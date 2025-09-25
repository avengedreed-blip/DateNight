import React, { useState } from "react";
import { useStatsDashboard } from "../hooks/useStatsDashboard.js";

const placeholderStyle = {
  fontFamily: "monospace",
  fontSize: "0.75rem",
  padding: "1rem",
  marginTop: "1.5rem",
  background: "rgba(15, 23, 42, 0.75)",
  color: "#f8fafc",
  borderRadius: "0.75rem",
  maxHeight: "20rem",
  overflow: "auto",
  border: "1px solid rgba(148, 163, 184, 0.25)",
};

const toggleContainerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "0.75rem",
};

const toggleButtonStyle = (active) => ({
  fontFamily: "inherit",
  fontSize: "0.75rem",
  padding: "0.25rem 0.75rem",
  borderRadius: "9999px",
  border: "1px solid rgba(148, 163, 184, 0.4)",
  background: active ? "rgba(56, 189, 248, 0.18)" : "transparent",
  color: "#f8fafc",
  cursor: "pointer",
  transition: "background 160ms ease, color 160ms ease",
});

const EMPTY_TOTALS = {
  rounds: 0,
  refusals: 0,
  timeouts: 0,
  triviaCorrect: 0,
  triviaIncorrect: 0,
  extremes: 0,
};

const buildDefaultLifetime = (mode) => ({
  totals: { ...EMPTY_TOTALS },
  longestStreak: 0,
  longestTriviaStreak: 0,
  maxAdrenaline: 0,
  milestoneBadges: [],
  updatedAt: 0,
  source: {
    mode: mode ?? "unknown",
    remoteEnabled: false,
    remoteReady: false,
    remoteError: null,
    profileId: null,
    collection: null,
    storageKey: null,
  },
});

const StatsDashboardPlaceholder = ({
  gameId,
  mode,
  playerId,
  db,
  lifetime: lifetimeProp,
}) => {
  const [view, setView] = useState("session");
  const dashboard = useStatsDashboard({ gameId, mode, playerId, db });
  const lifetime = lifetimeProp ?? buildDefaultLifetime(mode);

  const sessionPayload = dashboard;
  const lifetimePayload = {
    totals: lifetime.totals,
    longestStreak: lifetime.longestStreak,
    longestTriviaStreak: lifetime.longestTriviaStreak,
    maxAdrenaline: lifetime.maxAdrenaline,
    milestoneBadges: lifetime.milestoneBadges,
    updatedAt: lifetime.updatedAt,
    source: lifetime.source,
  };

  const displayPayload = view === "lifetime" ? lifetimePayload : sessionPayload;

  return (
    <section aria-label="Stats dashboard preview" style={placeholderStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <strong style={{ display: "block" }}>Stats Dashboard (preview)</strong>
        <div style={toggleContainerStyle}>
          <span
            aria-hidden="true"
            style={{ fontSize: "0.75rem", color: "rgba(226, 232, 240, 0.75)" }}
          >
            Viewing:
          </span>
          <button
            type="button"
            onClick={() => setView("session")}
            aria-pressed={view === "session"}
            style={toggleButtonStyle(view === "session")}
          >
            Session
          </button>
          <button
            type="button"
            onClick={() => setView("lifetime")}
            aria-pressed={view === "lifetime"}
            style={toggleButtonStyle(view === "lifetime")}
          >
            Lifetime
          </button>
        </div>
      </div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(displayPayload, null, 2)}
      </pre>
    </section>
  );
};

export default StatsDashboardPlaceholder;
