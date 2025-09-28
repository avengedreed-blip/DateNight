import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { AppStyles } from "./styles/AppStyles";
import "./styles/layout.css";
import "./styles/Modal.css";

import ParticleCanvas from "./components/ParticleCanvas";
import TruthDareModal from "./components/modals/TruthDareModal";
import TriviaModal from "./components/modals/TriviaModal";
import { SLICE_LABELS } from "./components/Wheel";
import SparkMeter from "./components/SparkMeter";
import Modal from "./components/modals/Modal";
import HelpModal from "./components/modals/HelpModal";
import SettingsModal from "./components/SettingsModal";
import TopBar from "./components/TopBar";
import ConsequenceModal from "./components/modals/ConsequenceModal";
import ExtremeRoundModal from "./components/modals/ExtremeRoundModal";

import { APP_ROUTES } from "./routes/appRoutes";

import { THEMES } from "./themeConfig";
import AudioManager from "./audio/AudioManager";
import mockProfile from "./constants/mockProfile";
import useExtremeMeter from "./hooks/useExtremeMeter";
import { defaultPrompts } from "./config/prompts";
import usePromptGenerator from "./hooks/usePromptGenerator";
import generateRandomGamePrompts from "./utils/randomPromptGenerator";
import useAnalytics from "./hooks/useAnalytics";
import useMultiplayerSession from "./hooks/useMultiplayerSession";
import useAchievements from "./hooks/useAchievements";

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

  // Tracks which modal is currently open. Values: null, 'prompt', 'help' or 'settings'.
  const [modalOpen, setModalOpen] = useState(null);

  // Track the current prompt category (truth, dare, trivia or consequence),
  // the actual prompt text and the associated intensity. When a wheel spin
  // finishes, these are populated and the appropriate modal is opened. The
  // intensity is stored so that, in the event of a refusal or incorrect
  // answer, we can display a consequence prompt at the same difficulty.
  const [promptCategory, setPromptCategory] = useState(null);
  const [promptContent, setPromptContent] = useState("");
  const [promptIntensity, setPromptIntensity] = useState(null);

  // Initialize the prompt generator. This hook manages default and custom
  // prompts, applies weights to reduce repeats and persists custom entries.
  const promptGenerator = usePromptGenerator({ playerId: profile?.id ?? null });

  // Store per‑game randomly generated prompts. These arrays are generated
  // when a new game begins and are consumed as prompts are selected. Once
  // empty, the app falls back to the default/custom prompt pool managed by
  // usePromptGenerator. Structure: { truth: { normal: [], spicy: [], extreme: [] }, dare: {...}, consequence: {...}, trivia: [] }
  const [gamePrompts, setGamePrompts] = useState(null);

  // Custom themes created by the user. Loaded from localStorage on mount and
  // persisted back when modified. Each theme is an object with id, name,
  // bg, colors, label, particles, meter and trackId.
  const [customThemes, setCustomThemes] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('dn_customThemes') || '[]');
        return Array.isArray(stored) ? stored : [];
      } catch (error) {
        return [];
      }
    }
    return [];
  });

  // Persist custom themes to localStorage whenever they change
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('dn_customThemes', JSON.stringify(customThemes));
      } catch (error) {
        console.warn('Failed to persist custom themes', error);
      }
    }
  }, [customThemes]);
  const [screenFlash, setScreenFlash] = useState(false);

  const wheelRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  // Use the extreme meter hook to drive the spark meter and intensity. This
  // hook manages meter increments based on round phase and whether a forced
  // extreme has occurred. The returned value ranges from 0 to 1.
  const {
    value: meterValue,
    isForced,
    phase,
    completeRound,
  } = useExtremeMeter();

  // Multiplayer session integration. Generate a persistent gameId for this
  // session and derive a playerId from the profile username. When
  // gameId is null (e.g. single-player modes), the hook operates in
  // offline mode and does not attempt to sync to Firestore.
  const gameIdRef = useRef(null);
  if (gameIdRef.current == null) {
    // Attempt to reuse a previously saved gameId in localStorage or create a new one.
    const savedId = typeof localStorage !== 'undefined' ? localStorage.getItem('dn_game_id') : null;
    if (savedId) {
      gameIdRef.current = savedId;
    } else {
      const newId = `game_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      gameIdRef.current = newId;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dn_game_id', newId);
      }
    }
  }
  const playerName = profile?.username ?? 'Player';
  const {
    // The current timer state from Firestore. When playing multiplayer this
    // will contain expiresAt and startedAt timestamps so we can compute
    // the remaining countdown. In single‑player mode this object remains
    // at its defaults and can be ignored.
    timer: remoteTimer,
    syncTimer,
    clearTimer,
    syncExtremeMeter,
    syncParticles,
  } = useMultiplayerSession({
    gameId: mode === 'multiplayer' ? gameIdRef.current : null,
    playerId: playerName,
  });

  // Analytics integration. Provide a dummy gameId and player information.
  const {
    logRound,
    logRefusal,
    logTriviaAccuracy,
  } = useAnalytics({ gameId: "localgame", playerId: profile?.id ?? "local", username: profile?.username ?? "Player" });

  // Initialise the achievements system.  This hook tracks the number of
  // rounds played, consecutive correct answers, and consecutive refusals,
  // unlocking achievements when thresholds are met.  Achievements persist
  // to localStorage and are merged into the profile so the Settings
  // modal can display them.
  const { achievements, stats, registerRound } = useAchievements();

  // Keep the profile's achievements up to date whenever the unlocked
  // achievements change.  Achievements are stored as an array on the
  // profile for display in Settings.  We avoid mutating the existing
  // profile by creating a shallow copy.
  useEffect(() => {
    setProfile((prev) => ({ ...prev, achievements }));
  }, [achievements]);
  const [lastResult, setLastResult] = useState(0);

  const wheelSlices = useMemo(
    () =>
      SLICE_LABELS.filter((label) => {
        // Restrict trivia slices when playing party mode. In party mode
        // only truth and dare (and consequently consequence) categories are
        // available. Other modes include trivia.
        if (mode === 'party') {
          return label.toLowerCase() !== 'trivia';
        }
        return true;
      }).map((label) => ({
        label,
        category:
          typeof label === "string" ? label.toLowerCase() : String(label ?? ""),
      })),
    [mode]
  );

  // Splash timeout → start screen
  useEffect(() => {
    if (screen === "splash") {
      const timer = setTimeout(() => setScreen("start"), 2500);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  useEffect(() => () => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
  }, []);

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

  // Compute the active particle theme.  When a prompt or consequence modal
  // is open we override the particle type and colour based on the
  // current prompt category and intensity.  This provides unique visual
  // feedback for truth, dare, trivia and consequence rounds.  Otherwise we
  // fall back to the selected theme's particle preset.
  const particleTheme = useMemo(() => {
    // Only override particles when a prompt or consequence is visible.  For
    // all other screens (e.g. spinning, settings), stick to the theme's
    // default particles.
    if (modalOpen === "prompt" || modalOpen === "consequence") {
      const category = promptCategory ?? "";
      const intensity = promptIntensity ?? "normal";
      // Map each category to a particle type.  See ParticleCanvas for
      // supported types: hearts, neon-dots, aurora and fireflies.
      let type;
      let color;
      switch (category) {
        case "truth":
          type = "hearts";
          color = theme.colors.truth;
          break;
        case "dare":
          type = "neon-dots";
          color = theme.colors.dare;
          break;
        case "trivia":
          type = "fireflies";
          color = theme.colors.trivia;
          break;
        case "consequence":
          type = "aurora";
          // Use the dare color for consequences to convey danger
          color = theme.colors.dare;
          break;
        default:
          type = theme.particles.type;
          color = theme.particles.color;
      }
      // Intensify the colour slightly for spicy and extreme rounds by
      // blending it towards white.  This simple mix brightens the colour
      // without adding new dependencies.  We clamp the result to valid hex.
      const mixColor = (base, percent) => {
        // Convert hex to RGB
        const r = parseInt(base.slice(1, 3), 16);
        const g = parseInt(base.slice(3, 5), 16);
        const b = parseInt(base.slice(5, 7), 16);
        const t = percent;
        const nr = Math.min(255, Math.round(r + (255 - r) * t));
        const ng = Math.min(255, Math.round(g + (255 - g) * t));
        const nb = Math.min(255, Math.round(b + (255 - b) * t));
        return `#${nr.toString(16).padStart(2, "0")}${ng
          .toString(16)
          .padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
      };
      let brightness = 0;
      if (intensity === "spicy") brightness = 0.15;
      if (intensity === "extreme") brightness = 0.3;
      const adjustedColor = brightness > 0 ? mixColor(color, brightness) : color;
      return {
        ...theme,
        particles: {
          type,
          color: adjustedColor,
        },
      };
    }
    return theme;
  }, [theme, modalOpen, promptCategory, promptIntensity]);

  // Compute particle intensity based on the current spark meter. A value of 1
  // represents a normal round, 2 represents spicy and 3 represents extreme. The
  // spark meter fills from 0 to 100; thresholds at 34 and 67 map to the
  // different intensity tiers. ParticleCanvas uses this intensity to scale
  // particle density and visual energy.
  // Derive a percentage for the spark meter (0–100) from the extreme meter's
  // value (0–1) and compute particle intensity tiers. The thresholds (34 and
  // 67) mirror those used for prompt intensity.
  const sparkPercent = useMemo(() => meterValue * 100, [meterValue]);

  const particleIntensity = useMemo(() => {
    if (sparkPercent < 34) return 1;
    if (sparkPercent < 67) return 2;
    return 3;
  }, [sparkPercent]);

  // Determine the timeout duration for prompt modals. In multiplayer mode
  // we inspect the remote timer from Firestore and compute the remaining
  // milliseconds until it expires. This value is passed to the modals so
  // all players see the same countdown. In single‑player mode the timer
  // always defaults to 30 seconds.
  const currentTimeoutMs = useMemo(() => {
    if (mode !== 'multiplayer') {
      return 30000;
    }
    const expiresAt = remoteTimer?.expiresAt;
    if (typeof expiresAt === 'number') {
      // Guard against negative durations when the timer has already expired
      const remaining = expiresAt - Date.now();
      return remaining > 0 ? remaining : 0;
    }
    return 30000;
  }, [mode, remoteTimer]);

  // Sync the extreme meter to multiplayer session whenever its value or forced
  // status changes. This effect runs in both single-player and multiplayer
  // modes, but syncExtremeMeter is a no-op when the hook is not provided
  // (i.e. gameId is null).
  useEffect(() => {
    if (mode === 'multiplayer' && typeof syncExtremeMeter === 'function') {
      syncExtremeMeter({ value: meterValue, isForced });
    }
  }, [meterValue, isForced, mode, syncExtremeMeter]);

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

  // Open the custom theme builder modal
  const handleOpenCustomTheme = useCallback(() => {
    setModalOpen('customTheme');
    playSfx('modal_open');
  }, [playSfx]);

  // Save a newly created custom theme. Adds it to the list of custom themes
  // and switches the active theme to the new theme. Also sets its music track
  // via the audio manager. The theme object should include an id.
  const handleSaveCustomTheme = useCallback((themeObj) => {
    if (!themeObj || !themeObj.id) {
      return;
    }
    setCustomThemes((prev) => [...prev, themeObj]);
    // Immediately switch to the newly created custom theme
    handleThemeChange(themeObj.id);
    // Ensure its track is played
    const trackId = themeObj.trackId;
    if (trackId) {
      audioManagerRef.current?.playTrack(trackId);
    }
  }, [handleThemeChange, audioManagerRef]);

  const handleCloseModal = useCallback(() => {
    // Reset open modal state and clear any prompt information. Clearing
    // promptCategory/content ensures stale prompts are not shown the next
    // time a modal opens.
    setModalOpen(null);
    setPromptCategory(null);
    setPromptContent("");
    setPromptIntensity(null);
    playSfx("modal_close");
    // Stop the shared round timer in multiplayer mode when any modal closes
    if (mode === 'multiplayer' && typeof clearTimer === 'function') {
      clearTimer();
    }
  }, [playSfx, mode, clearTimer]);

  /**
   * Display a consequence prompt at the current intensity. This helper
   * selects a random consequence from the default prompts matching the
   * stored intensity (normal, spicy or extreme). It updates the
   * promptCategory/content and opens the consequence modal.
   */
  const handleShowConsequence = useCallback(() => {
    const intensity = promptIntensity ?? "normal";
    const available = defaultPrompts.filter((p) => {
      return p.category === "consequence" && p.intensity === intensity;
    });
    const randomIndex = Math.floor(Math.random() * (available.length || 1));
    const selected = available[randomIndex]?.text;
    const fallbackText = "You must face a consequence.";
    setPromptCategory("consequence");
    setPromptContent(selected || fallbackText);
    setModalOpen("consequence");
  }, [promptIntensity]);

  // Accepting a truth/dare prompt or correctly answering trivia simply
   // closes the prompt modal. The round has already been counted when
   // the wheel stopped spinning, so no additional meter logic is needed.
  const handlePromptAccept = useCallback(() => {
    playSfx("click");
    // Log the completion of a truth or dare round
    if (typeof logRound === "function") {
      logRound({
        outcome: "completed",
        slice: promptCategory ?? "",
        mode: mode ?? "classic",
        intensity: promptIntensity ?? "normal",
      });
    }
    // Update achievements: this round was completed successfully
    registerRound({ wasCorrect: true, wasRefusal: false });
    handleCloseModal();
  }, [handleCloseModal, playSfx, logRound, promptCategory, promptIntensity, mode, registerRound]);

  // Refusing a truth/dare prompt triggers a consequence. The prompt
  // modal closes and a new consequence modal opens.
  const handlePromptRefuse = useCallback(() => {
    playSfx("boo");
    // Log a refusal event (manual reason)
    if (typeof logRefusal === "function") {
      logRefusal({ reason: "manual", slice: promptCategory ?? "" });
    }
    // Record this refusal for achievements
    registerRound({ wasCorrect: false, wasRefusal: true });
    handleShowConsequence();
  }, [handleShowConsequence, playSfx, logRefusal, promptCategory, registerRound]);

  // Correct trivia answer handler. Behaves like accepting any other prompt.
  const handleTriviaCorrect = useCallback(() => {
    playSfx("click");
    // Log trivia accuracy and round completion
    if (typeof logTriviaAccuracy === "function") {
      logTriviaAccuracy({ correct: true });
    }
    if (typeof logRound === "function") {
      logRound({
        outcome: "completed",
        slice: promptCategory ?? "trivia",
        mode: mode ?? "classic",
        intensity: promptIntensity ?? "normal",
      });
    }
    // Update achievements: correct answer counts as success
    registerRound({ wasCorrect: true, wasRefusal: false });
    handleCloseModal();
  }, [handleCloseModal, playSfx, logRound, logTriviaAccuracy, promptCategory, promptIntensity, mode, registerRound]);

  // Incorrect trivia answer handler (includes timeouts). Shows a consequence.
  const handleTriviaIncorrect = useCallback(() => {
    playSfx("boo");
    // Log trivia inaccuracy and refusal
    if (typeof logTriviaAccuracy === "function") {
      logTriviaAccuracy({ correct: false });
    }
    if (typeof logRefusal === "function") {
      logRefusal({ reason: "trivia", slice: promptCategory ?? "trivia" });
    }
    // Record this incorrect answer as a refusal for achievements
    registerRound({ wasCorrect: false, wasRefusal: true });
    handleShowConsequence();
  }, [handleShowConsequence, playSfx, logTriviaAccuracy, logRefusal, promptCategory, registerRound]);

  /**
   * Called when the extreme round modal is closed. This function opens the
   * previously prepared prompt. The prompt category/content/intensity have
   * already been set in handleWheelSpinEnd, so we simply transition the
   * modal state from "extreme" to "prompt".
   */
  const handleExtremeContinue = useCallback(() => {
    // When the extreme modal closes, open the prompt modal. Trigger a
    // success sound to accompany the transition.
    playSfx("click");
    // In multiplayer mode, sync the start of the extreme round timer when
    // transitioning from the extreme modal to the prompt.
    if (mode === 'multiplayer' && typeof syncTimer === 'function') {
      const startTs = Date.now();
      syncTimer({
        durationMs: 30000,
        ownerId: playerName,
        startedAt: startTs,
        expiresAt: startTs + 30000,
      });
    }
    setModalOpen("prompt");
  }, [playSfx, mode, syncTimer, playerName]);

  const handleSpin = useCallback(() => {
    if (spinning) return;
    const api = wheelRef.current;
    if (!api) return;
    if (typeof api.isLocked === "function" && api.isLocked()) return;
    api.spinWheel();
  }, [spinning, wheelRef]);

  const handleWheelSpinStart = useCallback(() => {
    setSpinning(true);
    playSfx("spin_start");
  }, [playSfx]);

  const triggerExtremeEffects = useCallback(() => {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    playSfx("extreme_fanfare");
    setScreenFlash(true);
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = setTimeout(() => setScreenFlash(false), 600);
  }, [playSfx]);

  const handleWheelSpinEnd = useCallback(
    (result) => {
      setSpinning(false);
      // Record the index of the slice for analytics or future use
      if (typeof result?.index === "number") {
        setLastResult(result.index);
      }

      // Determine if this round is extreme. We treat three cases:
      // 1) The meter is full (isForced) which triggers a guaranteed extreme round.
      // 2) The underlying wheel reported an extreme slice via result.isExtreme.
      // 3) A random chance triggers an extreme round (extremeRandom), but
      //    this does not reset the meter. Random extreme rounds still
      //    increment the meter normally via completeRound.
      const extremeRandomChance = 0.1; // 10% chance per spin for a random extreme round
      const extremeRandom = Math.random() < extremeRandomChance;
      const extreme = Boolean(isForced || result?.isExtreme || extremeRandom);
      // Fire appropriate sound and visual effects depending on whether this
      // round is an extreme round. Random extreme rounds still trigger
      // fireworks/confetti but do not reset the extreme meter.
      if (extreme) {
        triggerExtremeEffects();
      } else {
        playSfx("spin_end");
      }
      // Update the extreme meter. Passing triggeredByMeter = isForced causes
      // completeRound to reset the meter only when a meter‑triggered extreme
      // occurred. Random extreme rounds (isForced = false) increment the meter
      // normally without resetting it. isForced comes from the hook and
      // reflects whether the meter hit 100% before this spin.
      completeRound({ triggeredByMeter: isForced });

      // Determine which prompt category to display based on the wheel slice
      // result. We treat extreme rounds specially: trivia is disallowed
      // during extreme rounds, so if the selected slice is trivia we choose
      // between truth and dare instead. Otherwise we use the selected slice.
      let category = SLICE_LABELS[result?.index]?.toLowerCase() ?? "truth";
      if (extreme && category === 'trivia') {
        // Randomly pick truth or dare when trivia would have been selected
        category = Math.random() < 0.5 ? 'truth' : 'dare';
      }
      setPromptCategory(category);

      // Determine the intensity for the prompt. In extreme rounds we
      // automatically use the highest tier. Otherwise the intensity is based
      // on the current meter percentage.
      let intensityLabel;
      if (extreme) {
        intensityLabel = 'extreme';
      } else {
        const meterPercentage = meterValue * 100;
        if (meterPercentage >= 67) {
          intensityLabel = 'extreme';
        } else if (meterPercentage >= 34) {
          intensityLabel = 'spicy';
        } else {
          intensityLabel = 'normal';
        }
      }
      setPromptIntensity(intensityLabel);

      // Determine a prompt text. First attempt to consume from this game's
      // generated prompt pool. Once those lists are exhausted, fall back to
      // the default/custom pool provided by usePromptGenerator. Trivia
      // prompts never have intensities, so we access the top‑level array.
      let selectedText = null;
      if (gamePrompts) {
        if (category === "trivia") {
          const triviaList = gamePrompts.trivia;
          if (Array.isArray(triviaList) && triviaList.length > 0) {
            selectedText = triviaList[0];
            // Remove the used prompt from the list
            const nextTrivia = triviaList.slice(1);
            setGamePrompts((prev) => ({
              ...prev,
              trivia: nextTrivia,
            }));
          }
        } else {
          const byIntensity = gamePrompts[category];
          if (byIntensity && Array.isArray(byIntensity[intensityLabel]) && byIntensity[intensityLabel].length > 0) {
            selectedText = byIntensity[intensityLabel][0];
            const nextList = byIntensity[intensityLabel].slice(1);
            setGamePrompts((prev) => ({
              ...prev,
              [category]: {
                ...prev[category],
                [intensityLabel]: nextList,
              },
            }));
          }
        }
      }
      // If no generated prompt was available, call the prompt generator to
      // retrieve one from the merged pool (default + custom). The hook
      // returns an object with id, category, intensity and text. Pass
      // intensity only for categories that require it.
      if (!selectedText && promptGenerator && typeof promptGenerator.getPrompt === 'function') {
        const promptObj = promptGenerator.getPrompt(category, category === 'trivia' ? null : intensityLabel);
        if (promptObj && promptObj.text) {
          selectedText = promptObj.text;
        }
      }
      // Fallback text if no prompt was found.
      const fallbackText =
        category === "trivia"
          ? "Answer this trivia question."
          : `Perform a ${category} challenge.`;
      setPromptContent(selectedText || fallbackText);

      // If this spin was an extreme round (random or meter-triggered), show the
      // ExtremeRoundModal first. Otherwise, open the prompt immediately.
      if (extreme) {
        // Open the extreme modal; the prompt will be shown after the modal
        // closes via handleExtremeContinue.
        setModalOpen("extreme");
      } else {
        // When not an extreme round, immediately start the round timer in
        // multiplayer mode so all players share the countdown.
        if (mode === 'multiplayer' && typeof syncTimer === 'function') {
          const startTs = Date.now();
          syncTimer({
            durationMs: 30000,
            ownerId: playerName,
            startedAt: startTs,
            expiresAt: startTs + 30000,
          });
        }
        setModalOpen("prompt");
      }
    },
    [completeRound, isForced, meterValue, playSfx, triggerExtremeEffects, mode, syncTimer, playerName, gamePrompts, promptGenerator]
  );

  const handleStartGame = useCallback(() => {
    playSfx("success");
    // Generate a fresh set of random prompts for the upcoming game. This
    // ensures each new game begins with unique content blended with the
    // default/custom prompt pool. The current mode is passed so the
    // generator can tailor output (e.g. party mode could omit certain
    // categories). The result is stored in state and consumed in
    // handleWheelSpinEnd.
    const freshGamePrompts = generateRandomGamePrompts({ mode });
    setGamePrompts(freshGamePrompts);
    // Reset the round counter in the prompt generator so phase‑based
    // intensity selection resets at the start of each game.
    if (promptGenerator && typeof promptGenerator.setRoundNumber === 'function') {
      promptGenerator.setRoundNumber(0);
    }
    setScreen("game");
  }, [playSfx, mode, promptGenerator]);

  const routeSpecificProps = useMemo(
    () => {
      const openHelp = () => handleOpenModal("help");
      const openSettings = () => handleOpenModal("settings");

      return {
        splash: {},
        start: {
          onPickMode: handlePickMode,
        },
        select: {
          mode,
          onStart: handleStartGame,
        },
        game: {
          onSpin: handleSpin,
          spinning,
          // Provide the current meter percentage to the game screen. The
          // GameScreen component uses this value to show the SparkMeter when no
          // custom meter element is provided.
          spark: sparkPercent,
          onWheelSpinStart: handleWheelSpinStart,
          onWheelSpinEnd: handleWheelSpinEnd,
          wheelRef,
          slices: wheelSlices,
          enableSwipe: true,
          onHelpClick: openHelp,
          onSettingsClick: openSettings,
          topBar: (
            <TopBar
              title="Date Night"
              subtitle={modeSubtitle}
              onHelp={openHelp}
              onSettings={openSettings}
            />
          ),
          // Custom SparkMeter element using the computed percentage
          sparkMeter: <SparkMeter value={sparkPercent} />,
        },
      };
    },
    [
      handleOpenModal,
      handlePickMode,
      handleSpin,
      handleWheelSpinEnd,
      handleWheelSpinStart,
      handleStartGame,
      mode,
      modeSubtitle,
      sparkPercent,
      wheelRef,
      wheelSlices,
      spinning,
    ]
  );

  return (
    <div className={`animated-background ${screenFlash ? "screen-flash-active" : ""}`}>
      <style>{AppStyles}</style>
      <ParticleCanvas theme={particleTheme} intensity={particleIntensity} />
      {/* Removed SparkMeter showcase section */}

      {APP_ROUTES.map(({ id, Component }) => {
        const isActive = screen === id;
        const props = routeSpecificProps[id] ?? {};

        return (
          <div key={id} className={`screen ${isActive ? "enter" : ""}`}>
            {isActive ? <Component {...props} /> : null}
          </div>
        );
      })}

      {/* Render prompt modals when a wheel result occurs. Truth and Dare
          results use the TruthDareModal, while Trivia uses the TriviaModal.
          Pass in accept/refuse handlers to drive consequences and modal
          closure. */}
      {modalOpen === "prompt" && promptCategory !== "trivia" && (
        <TruthDareModal
          isOpen={true}
          onClose={handleCloseModal}
          content={promptContent}
          onAccept={handlePromptAccept}
          onRefuse={handlePromptRefuse}
          // Provide a timeout duration based on multiplayer state. In
          // multiplayer this reflects the shared timer; in single‑player
          // it defaults to 30s. The TruthDareModal will treat a timeout
          // as a refusal.
          timeoutMs={currentTimeoutMs}
        />
      )}
      {modalOpen === "prompt" && promptCategory === "trivia" && (
        <TriviaModal
          isOpen={true}
          onClose={handleCloseModal}
          content={promptContent}
          onCorrect={handleTriviaCorrect}
          onIncorrect={handleTriviaIncorrect}
          // Provide a timeout duration based on multiplayer state. The
          // TriviaModal will treat a timeout as an incorrect answer.
          timeoutMs={currentTimeoutMs}
        />
      )}

      {/* Render a consequence modal when a prompt is refused or answered
          incorrectly. There is only one button (Accept) that closes the
          consequence modal. */}
      {modalOpen === "consequence" && (
        <ConsequenceModal
          isOpen={true}
          onClose={() => {
            playSfx("click");
            handleCloseModal();
          }}
          content={promptContent}
        />
      )}

      {/* Render an extreme round modal when a spin triggers an extreme round.
          After the user acknowledges the extreme round, the prepared prompt
          will display via handleExtremeContinue. */}
      {modalOpen === "extreme" && (
        <ExtremeRoundModal
          isOpen={true}
          onClose={() => {
            // When either button is clicked, continue to the prompt.
            handleExtremeContinue();
          }}
          content={"This is an extreme round! Get ready."}
        />
      )}

      <HelpModal
        isOpen={modalOpen === "help"}
        onClose={() => {
          playSfx("click");
          handleCloseModal();
        }}
      />

      {modalOpen === "settings" && (
        <SettingsModal
          open={true}
          onClose={handleCloseModal}
          themeKey={themeKey}
          onThemeChange={handleThemeChange}
          audio={audioControls}
          profile={profile}
          onAvatarChange={handleAvatarChange}
          // Supply the prompt editor API so players can manage custom prompts.
          promptEditor={promptGenerator}
          // Provide statistics for the Stats tab
          achievementStats={stats}
        />
      )}
    </div>
  );
}
