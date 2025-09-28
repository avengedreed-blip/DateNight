import { memo } from "react";
import TopBar from "../components/TopBar";
import Wheel from "../components/Wheel";
import SparkMeter from "../components/SparkMeter";

const GameScreen = memo(
  ({
    rotation,
    onSpin,
    spinning,
    spark,
    onSpinDone,
    onSettingsClick,
    onHelpClick,
    topBar,
    sparkMeter,
  }) => (
    <div className="game-screen">
      {topBar ?? (
        <TopBar
          title="Date Night"
          onSettings={onSettingsClick}
          onHelp={onHelpClick}
        />
      )}
      <main className="game-main">
        <Wheel rotation={rotation} isSpinning={spinning} onDone={onSpinDone} />
        <button
          className="spin-button btn grad-dare"
          onClick={onSpin}
          disabled={spinning}
        >
          {spinning ? "Spinning…" : "Spin"}
        </button>
        {sparkMeter ?? <SparkMeter value={spark} />}
      </main>
    </div>
  )
);

export default GameScreen;
