import React, { useState, useEffect, useCallback, useMemo } from "react";
import confetti from "canvas-confetti";
import { AppStyles } from "./styles/AppStyles";

import ParticleCanvas from "./components/ParticleCanvas";
import Wheel, { SLICE_LABELS, SLICE_CENTERS } from "./components/Wheel";
import SparkMeter from "./components/SparkMeter";
import Modal from "./components/Modal";
import SettingsModal from "./components/SettingsModal";
import TopBar from "./components/TopBar";

import SplashScreen from "./components/Screens/SplashScreen";
import StartScreen from "./components/Screens/StartScreen";
import ModeSelectionScreen from "./components/Screens/ModeSelectionScreen";
import GameScreen from "./components/Screens/GameScreen";

import { THEMES, getLuminance } from "./themeConfig";

export default function App() {
  const [screen, setScreen] = useState("splash");
  const [mode, setMode] = useState(null);
  const [themeKey, setThemeKey] = useState("classic-dark");
  const theme = THEMES[themeKey];

  const [modalOpen, setModalOpen] = useState(null); // null | 'result' | 'help' | 'settings'
  const [screenFlash, setScreenFlash] = useState(false);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spark, setSpark] = useState(0);
  const [lastResult, setLastResult] = useState(0);

  // Splash timeout → start screen
  useEffect(() => {
    if (screen === "splash") {
      const timer = setTimeout(() => setScreen("start"), 2500);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // Apply theme tokens to :root
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--bg-start", theme.bg[0]);
    r.style.setProperty("--bg-end", theme.bg[1]);
    r.style.setProperty("--truth", theme.colors.truth);
    r.style.setProperty("--dare", theme.colors.dare);
    r.style.setProperty("--trivia", theme.colors.trivia);
    r.style.setProperty("--meter-a", theme.meter[0]);
    r.style.setProperty("--meter-b", theme.meter[1]);

    const bgLuminance =
      (getLuminance(theme.bg[0]) + getLuminance(theme.bg[1])) / 2;
    const textColor = bgLuminance < 0.5 ? "#FFFFFF" : "#111111";

    r.style.setProperty("--text", textColor);
    r.style.setProperty("--ring", textColor);
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

  const modeSubtitle = useMemo(() => {
    if (!mode) return undefined;
    const capitalized = mode[0].toUpperCase() + mode.slice(1);
    return `${capitalized} Mode`;
  }, [mode]);

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
    setModalOpen("result");
  }, []);

  return (
    <div className={`animated-background ${screenFlash ? "screen-flash-active" : ""}`}>
      <style>{AppStyles}</style>
      <ParticleCanvas theme={particleTheme} />

      <div className={`screen ${screen === "splash" ? "enter" : ""}`}>
        {screen === "splash" && <SplashScreen />}
      </div>
      <div className={`screen ${screen === "start" ? "enter" : ""}`}>
        {screen === "start" && <StartScreen onPickMode={handlePickMode} />}
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
            onHelpClick={() => setModalOpen("help")}
            onSettingsClick={() => setModalOpen("settings")}
            topBar={
              <TopBar
                title="Date Night"
                subtitle={modeSubtitle}
                onHelp={() => setModalOpen("help")}
                onSettings={() => setModalOpen("settings")}
              />
            }
            sparkMeter={<SparkMeter value={spark} />}
          />
        )}
      </div>

      <Modal
        title="Result"
        open={modalOpen === "result"}
        onClose={() => setModalOpen(null)}
        actions={[
          <button
            key="1"
            className="btn grad-pink"
            onClick={() => setModalOpen(null)}
          >
            Continue
          </button>,
        ]}
      >
        <p>
          The wheel landed on:{" "}
          <strong>{SLICE_LABELS[lastResult] ?? "..."}</strong>
        </p>
      </Modal>

      <Modal
        title="Help"
        open={modalOpen === "help"}
        onClose={() => setModalOpen(null)}
        actions={[
          <button
            key="1"
            className="btn grad-pink"
            onClick={() => setModalOpen(null)}
          >
            Got It!
          </button>,
        ]}
      >
        <p>This is the help text for the game!</p>
      </Modal>

      {modalOpen === "settings" && (
        <SettingsModal open onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
