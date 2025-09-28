import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { AppStyles } from "./styles/AppStyles";
import "./styles/layout.css";
import "./styles/Modal.css";

import ParticleCanvas from "./components/ParticleCanvas";
import Wheel, {
  SLICE_LABELS,
  SLICE_CENTERS,
  POINTER_ANGLE,
} from "./components/Wheel";
import SparkMeter from "./components/SparkMeter";
import Modal from "./components/modals/Modal";
import SettingsModal from "./components/SettingsModal";
import TopBar from "./components/TopBar";

import SplashScreen from "./screens/SplashScreen";
import StartScreen from "./screens/StartScreen.jsx";
import ModeSelectionScreen from "./screens/ModeSelectionScreen.jsx";
import GameScreen from "./screens/GameScreen.jsx";

import { THEMES } from "./themeConfig";
import AudioManager from "./audio/AudioManager";
import mockProfile from "./constants/mockProfile";

const THEME_TRACK_MAP = {
  "classic-dark": "classic_dark",
  "romantic-glow": "romantic_glow",
  "playful-neon": "playful_neon",
  "mystic-night": "mystic_night",
  "custom-1-chillwave": "custom_1_chillwave",
  "custom-2-arcade": "custom_2_arcade",
  "custom-3-ambient": "custom_3_ambient",
};

const DEFAULT_AUDIO_STATE = {
  volume: 0.8,
  musicVolume: 0.8,
  sfxVolume: 0.8,
  muted: false,
  track: null,
};

function getLuminance(hex) {
  if (!hex || typeof hex !== "string") return 0;
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const a = [r, g, b].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export default function App() {
  const [screen, setScreen] = useState("splash");
  const [mode, setMode] = useState(null);
  const [themeKey, setThemeKey] = useState("classic-dark");
  const theme = THEMES[themeKey] ?? THEMES["classic-dark"];

  const audioManagerRef = useRef(null);
  if (!audioManagerRef.current && typeof window !== "undefined") {
    audioManagerRef.current = new AudioManager();
  }
  const manager = audioManagerRef.current;
  const [audioState, setAudioState] = useState(
    () => manager?.getState?.() ?? DEFAULT_AUDIO_STATE
  );

  useEffect(() => {
    if (!manager) return undefined;
    const unsubscribe = manager.subscribe((state) => {
      setAudioState(state);
    });
    return unsubscribe;
  }, [manager]);
  const [profile, setProfile] = useState(() => ({
    ...mockProfile,
    avatar: mockProfile.avatar ?? "avatar-bolt",
    themeId: mockProfile.themeId ?? "classic-dark",
  }));

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

  const setTrackForTheme = useCallback((nextThemeKey) => {
    if (!nextThemeKey) return;
    const trackId = THEME_TRACK_MAP[nextThemeKey] ?? THEME_TRACK_MAP["classic-dark"];
    audioManagerRef.current?.playTrack(trackId);
  }, []);

  useEffect(() => {
    setTrackForTheme(themeKey);
  }, [themeKey, setTrackForTheme]);

  const playSfx = useCallback((name) => {
    audioManagerRef.current?.playSFX(name);
  }, []);

  const audioControls = useMemo(() => {
    const fallbackTrack =
      audioState.track ?? THEME_TRACK_MAP[themeKey] ?? THEME_TRACK_MAP["classic-dark"];
    return {
      state: { ...audioState, track: fallbackTrack },
      playSFX: (name) => audioManagerRef.current?.playSFX(name),
      playTrack: (trackId) => audioManagerRef.current?.playTrack(trackId),
      stopTrack: () => audioManagerRef.current?.stopTrack(),
      setMusicVolume: (value) => audioManagerRef.current?.setMusicVolume(value),
      setSfxVolume: (value) => audioManagerRef.current?.setSfxVolume(value),
      setVolume: (value) => audioManagerRef.current?.setVolume(value),
      toggleMute: () => audioManagerRef.current?.toggleMute(),
    };
  }, [audioState, themeKey]);

  const handleThemeChange = useCallback(
    (nextThemeKey) => {
      if (
        !nextThemeKey ||
        !Object.prototype.hasOwnProperty.call(THEMES, nextThemeKey)
      ) {
        // removed erroneous return; (caused blank screen)
      }
      setThemeKey(nextThemeKey);
      setProfile((prev) => ({
        ...prev,
        themeId: nextThemeKey,
      }));
      setTrackForTheme(nextThemeKey);
    },
    [setTrackForTheme]
  );

  const handleAvatarChange = useCallback(
    (nextAvatar, options = {}) => {
      if (!nextAvatar) return;
      setProfile((prev) => ({
        ...prev,
        avatar: nextAvatar,
      }));
      if (!options.silent) {
        playSfx("click");
      }
    },
    [playSfx]
  );

  const handlePickMode = useCallback((m) => {
    playSfx("click");
    setMode(m);
    const nextTheme =
      m === "together"
        ? "romantic-glow"
        : m === "multiplayer"
        ? "playful-neon"
        : "mystic-night";
    setThemeKey(nextTheme);
    setTrackForTheme(nextTheme);
    setScreen("select");
  }, [playSfx, setTrackForTheme]);

  const modeSubtitle = useMemo(() => {
    if (!mode) return undefined;
    const capitalized = mode[0].toUpperCase() + mode.slice(1);
    return `${capitalized} Mode`;
  }, [mode]);

  const handleOpenModal = useCallback(
    (nextModal) => {
      setModalOpen(nextModal);
      playSfx("modal_open");
    },
    [playSfx]
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(null);
    playSfx("modal_close");
  }, [playSfx]);

  const handleSpin = useCallback(() => {
    if (spinning) return;

    playSfx("spin_start");

    const index = Math.floor(Math.random() * 3);
    const center = SLICE_CENTERS[index];
    const pointerTarget =
      ((POINTER_ANGLE - center) % 360 + 360) % 360;
    const baseMod = ((rotation % 360) + 360) % 360;
    let extra = pointerTarget - baseMod;
    if (extra < 0) extra += 360;

    const spins = 4 + Math.floor(Math.random() * 3);
    const target = rotation + spins * 360 + extra;

    setLastResult(index);
    setRotation(target);
    setSpinning(true);
  }, [playSfx, spinning, rotation]);

  const handleSpinDone = useCallback(() => {
    setSpinning(false);
    playSfx("spin_end");

    const nextSpark = Math.min(100, spark + 34);
    const triggeredExtreme = nextSpark >= 100;

    if (triggeredExtreme) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      playSfx("extreme_fanfare");
      setScreenFlash(true);
      setTimeout(() => setScreenFlash(false), 600);
      setSpark(0);
    } else {
      playSfx("success");
      setSpark(nextSpark);
    }

    handleOpenModal("result");
  }, [playSfx, spark, handleOpenModal]);

  const handleStartGame = useCallback(() => {
    playSfx("success");
    setScreen("game");
  }, [playSfx]);

  return (
    <div className={`animated-background ${screenFlash ? "screen-flash-active" : ""}`}>
      <style>{AppStyles}</style>
      <ParticleCanvas theme={particleTheme} />
      {/* The SparkMeters are now containerized in a styled section */}
      <section className="spark-section" aria-labelledby="spark-section-heading">
        <h2 id="spark-section-heading">Spark Meter Showcase</h2>
        <SparkMeter value={65} theme="truth" />
        <SparkMeter value={85} theme="dare" />
        <SparkMeter value={45} theme="trivia" />
        <SparkMeter value={100} theme="consequence" />
      </section>

      <div className={`screen ${screen === "splash" ? "enter" : ""}`}>
        {screen === "splash" && <SplashScreen />}
      </div>
      <div className={`screen ${screen === "start" ? "enter" : ""}`}>
        {screen === "start" && <StartScreen onPickMode={handlePickMode} />}
      </div>
      <div className={`screen ${screen === "select" ? "enter" : ""}`}>
        {screen === "select" && (
          <ModeSelectionScreen mode={mode} onStart={handleStartGame} />
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
            onHelpClick={() => handleOpenModal("help")}
            onSettingsClick={() => handleOpenModal("settings")}
            topBar={
              <TopBar
                title="Date Night"
                subtitle={modeSubtitle}
                onHelp={() => handleOpenModal("help")}
                onSettings={() => handleOpenModal("settings")}
              />
            }
            sparkMeter={<SparkMeter value={spark} />}
          />
        )}
      </div>

      <Modal
        title="Result"
        open={modalOpen === "result"}
        onClose={handleCloseModal}
        actions={[
          <button
            key="1"
            className="btn grad-pink"
            onClick={() => {
              playSfx("click");
              handleCloseModal();
            }}
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
        onClose={handleCloseModal}
        actions={[
          <button
            key="1"
            className="btn grad-pink"
            onClick={() => {
              playSfx("click");
              handleCloseModal();
            }}
          >
            Got It!
          </button>,
        ]}
      >
        <p>This is the help text for the game!</p>
      </Modal>

      {modalOpen === "settings" && (
        <SettingsModal
          open
          onClose={handleCloseModal}
          themeKey={themeKey}
          onThemeChange={handleThemeChange}
          audio={audioControls}
          profile={profile}
          onAvatarChange={handleAvatarChange}
        />
      )}
    </div>
  );
}
