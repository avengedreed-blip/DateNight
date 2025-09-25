import React from "react";
import Wheel from "./components/Wheel";

function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem 1rem",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        backgroundColor: "#f9fafb",
        color: "#111827",
      }}
    >
      <h1 style={{ marginBottom: "1rem", textAlign: "center" }}>
        Date Night App — Scaffold Ready
      </h1>
      <Wheel />
    </main>
  );
}

export default App;
