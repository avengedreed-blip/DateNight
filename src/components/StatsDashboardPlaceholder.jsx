import React from "react";
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

const StatsDashboardPlaceholder = ({ gameId, mode, playerId, db }) => {
  const dashboard = useStatsDashboard({ gameId, mode, playerId, db });

  return (
    <section aria-label="Stats dashboard preview" style={placeholderStyle}>
      <strong style={{ display: "block", marginBottom: "0.5rem" }}>
        Stats Dashboard (preview)
      </strong>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(dashboard, null, 2)}
      </pre>
    </section>
  );
};

export default StatsDashboardPlaceholder;
