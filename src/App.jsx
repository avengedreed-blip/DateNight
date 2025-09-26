import React, { useState, useEffect, useCallback, useMemo } from "react";
import confetti from "canvas-confetti";

import ParticleCanvas from "./components/ParticleCanvas";
import Modal from "./components/Modal";
import SettingsModal from "./components/SettingsModal";
import StartScreen from "./screens/StartScreen";
import ModeSelectionScreen from "./screens/ModeSelectionScreen";
import GameScreen from "./screens/GameScreen";

import { THEMES } from "./constants/themes";
import { mockProfile } from "./constants/mockProfile";
import { SLICE_LABELS, SLICE_CENTERS } from "./components/Wheel";

import "./styles/global.css";

export default function App() {
  const [screen, setScreen] = useState("start");
  const [mode, setMode] = useState(null);
  const [themeKey, setThemeKey] = useState("classic-dark");
  const theme = THEMES[themeKey];
  const [modal, setModal] = useState(null);
  const [screenFlash, setScreenFlash] = useState(false);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spark, setSpark] = useState(0);
  const [lastResult, setLastResult] = useState(0);

  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--bg-start", theme.bg[0]);
    r.style.setProperty("--bg-end", theme.bg[1]);
    r.style.setProperty("--truth", theme.colors.truth);
    r.style.setProperty("--dare", theme.colors.dare);
    r.style.setProperty("--trivia", theme.colors.trivia);
    r.style.setProperty("--meter-a", theme.meter[0]);
    r.style.setProperty("--meter-b", theme.meter[1]);
    r.style.setProperty("--text", theme.label === "white" ? "#fff" : "#111");
    r.style.setProperty("--ring", theme.label === "white" ? "#fff" : "#111");
    r.style.setProperty("--theme-primary", theme.colors.truth);
  }, [theme]);

  const particleTheme = useMemo(() => theme, [theme]);

  const handlePickMode = useCallback((m) => {
    setMode(m);
    setThemeKey(
      m === "together"
        ? "romantic-glow"
        : m === "multiplayer"
        ? "playful-neon"
        : "mystic-night"
    );
    setScreen("select");
  }, []);

  const handleSpin = useCallback(() => {
    if (spinning) return;

    const index = Math.floor(Math.random() * 3);
    const center = SLICE_CENTERS[index];
    const wantMod = ((360 - center) % 360 + 360) % 360;
    const baseMod = ((rotation % 360) + 360) % 360;
    let extra = wantMod - baseMod;
    if (extra < 0) extra += 360;

    const spins = 4 + Math.floor(Math.random() * 3);
    const target = rotation + spins * 360 + extra;

    setLastResult(index);
    setRotation(target);
    setSpinning(true);
  }, [spinning, rotation]);

  const handleSpinDone = useCallback(() => {
    setSpinning(false);
    setSpark((prevSpark) => {
      const newSpark = Math.min(100, prevSpark + 34);
      if (newSpark >= 100) {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        setScreenFlash(true);
        setTimeout(() => setScreenFlash(false), 600);
        return 0;
      }
      return newSpark;
    });
    setModal("result");
  }, []);

  return (
    <div className={screenFlash ? "screen-flash-active" : ""}>
      <ParticleCanvas theme={particleTheme} />

      <div className={`screen ${screen === "start" ? "enter" : ""}`}>
        <StartScreen onPickMode={handlePickMode} />
      </div>
      <div className={`screen ${screen === "select" ? "enter" : ""}`}>
        {screen === "select" && (
          <ModeSelectionScreen mode={mode} onStart={() => setScreen("game")} />
        )}
      </div>
      <div className={`screen ${screen === "game" ? "enter" : ""}`}>
        {screen === "game" && (
          <GameScreen
            rotation={rotation}
            onSpin={handleSpin}
            spinning={spinning}
            spark={spark}
            onSpinDone={handleSpinDone}
            onSettingsClick={() => setModal("settings")}
            onHelpClick={() => setModal("help")}
          />
        )}
      </div>

      <Modal
        title="Result"
        open={modal === "result"}
        onClose={() => setModal(null)}
        actions={[
          <button key="1" className="btn grad-pink" onClick={() => setModal(null)}>
            Continue
          </button>,
        ]}
      >
        <p>
          The wheel landed on:{" "}
          <strong>{SLICE_LABELS[lastResult] ?? "..."}</strong>
        </p>
      </Modal>

      <SettingsModal
        open={modal === "settings"}
        onClose={() => setModal(null)}
        onThemeChange={setThemeKey}
        profile={mockProfile}
      />
    </div>
  );
}
