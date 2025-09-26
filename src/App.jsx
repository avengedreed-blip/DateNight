import React, {
  useState, useEffect, useCallback, useMemo, memo, useRef
} from "react";
import confetti from "canvas-confetti";
import ParticleCanvas from "./components/ParticleCanvas";
import TopBar from "./components/TopBar";
import Wheel, { SLICE_CENTERS, SLICE_LABELS } from "./components/Wheel";
import SparkMeter from "./components/SparkMeter";
import Modal from "./components/Modal";
import SettingsModal from "./components/SettingsModal";
import { THEMES } from "./theme/themes";
import mockProfile from "./data/mockProfile";
import StartScreen from "./screens/StartScreen";
import ModeSelectionScreen from "./screens/ModeSelectionScreen";
import GameScreen from "./screens/GameScreen";

/* ============================================================================ 
   GLOBAL STYLES 
   ========================================================================== */
const AppStyles = `…`   // keep full CSS content you pasted earlier

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
    setThemeKey(m === "together" ? "romantic-glow" : m === "multiplayer" ? "playful-neon" : "mystic-night");
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
    setSpark(prevSpark => {
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
    <div className={screenFlash ? 'screen-flash-active' : ''}>
      <style>{AppStyles}</style>
      <ParticleCanvas theme={particleTheme} />
      <div className={`screen ${screen === "start" ? "enter" : ""}`}>
        <StartScreen onPickMode={handlePickMode} />
      </div>
      <div className={`screen ${screen === "select" ? "enter" : ""}`}>
        {screen

