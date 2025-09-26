import React, { memo } from "react";
import TopBar from "../components/TopBar";
import Wheel from "../components/Wheel";
import SparkMeter from "../components/SparkMeter";

const GameScreen = memo(
  ({ rotation, onSpin, spinning, spark, onSpinDone, onSettingsClick, onHelpClick }) => (
    <div className="screen">
      <TopBar title="Date Night" onHelp={onHelpClick} onSettings={onSettingsClick} />
      <main
        style={{
          display: "grid",
          placeItems: "center",
          gap: 16,
          padding: "18px 12px 24px",
        }}
      >
        <Wheel rotation={rotation} isSpinning={spinning} onDone={onSpinDone} />
        <button
          className="btn grad-neon"
          style={{ width: 180 }}
          onClick={onSpin}
          disabled={spinning}
        >
          {spinning ? "Spinning…" : "Spin"}
        </button>
        <SparkMeter value={spark} />
      </main>
    </div>
  )
);

export default GameScreen;
