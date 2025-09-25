import confetti from "canvas-confetti";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AnnouncementModal from "./components/modals/AnnouncementModal.jsx";
import ConsequenceModal from "./components/modals/ConsequenceModal.jsx";
import EditorModal from "./components/modals/EditorModal.jsx";
import PromptModal from "./components/modals/PromptModal.jsx";
import SettingsModal from "./components/modals/SettingsModal.jsx";
import Wheel from "./components/Wheel.jsx";
import LoadingScreen from "./components/screens/LoadingScreen.jsx";
import StartScreen from "./components/screens/StartScreen.jsx";
import {
  SettingsIcon,
  SparklesIcon,
  FlameIcon,
} from "./components/icons/Icons.jsx";
import { useBackgroundMusic } from "./hooks/useBackgroundMusic.js";
import { useAnalytics } from "./hooks/useAnalytics.js";
import { usePlayerStats } from "./hooks/usePlayerStats.js";
import { usePersistentState } from "./hooks/usePersistentState.js";
import { usePrompts } from "./hooks/usePrompts.js";
import { useSound } from "./hooks/useSound.js";
import { db } from "./config/firebase.js";
import AdrenalineBar from "./components/HUD/AdrenalineBar.jsx";
import PlayerBadges from "./components/HUD/PlayerBadges.jsx";
import { setSessionMode, subscribeToSessionMode } from "./firebase/session.js";
import {
  buildPromptGroups,
  generatePromptSet,
} from "./utils/promptGenerator.js";
import StatsDashboardPlaceholder from "./components/StatsDashboardPlaceholder.jsx";
import { loadOffline, saveOffline } from "./utils/offlineStorage.js";

const STORAGE_KEYS = {
  gameId: "dateNightGameId",
  musicVolume: "dateNightMusicVol",
  sfxVolume: "dateNightSfxVol",
  roundCount: "dateNightRoundCount",
  lastPrompts: "dateNightLastPrompts",
  extremeMeter: "dateNightExtremeMeter",
  generatedPrompts: "dateNightGeneratedPrompts",
  mode: "dateNightMode",
  debugAnalytics: "dateNightDebugAnalyticsEnabled",
};

const PLAYER_STORAGE_KEY = "dateNightPlayerId";

const OFFLINE_GAME_ID = "OFFLINE";
const OFFLINE_SESSION_KEY = "dn_offline_session";
const OFFLINE_PROMPTS_KEY = "dn_offline_prompts";

const EXTREME_ROUND_CHANCE = 0.2;
const MAX_RECENT_PROMPTS = 25;
const BASE_SPIN_DURATION_MS = 4000;
const MIN_SWIPE_DISTANCE = 40;
const MIN_SWIPE_STRENGTH = 0.35;
const MAX_SWIPE_STRENGTH = 2;
const MIN_EXTRA_ROTATIONS = 4;
const MAX_EXTRA_ROTATIONS = 8;

const WHEEL_SEGMENTS = [
  {
    id: "truth",
    label: "Truth",
    color: "var(--wheel-truth)",
    title: "The Truth…",
    outcomes: {
      normal: "truth",
      spicy: "spicyTruth",
      extreme: "truthExtreme",
    },
  },
  {
    id: "dare",
    label: "Dare",
    color: "var(--wheel-dare)",
    title: "I Dare You!",
    outcomes: {
      normal: "dare",
      spicy: "spicyDare",
      extreme: "dareExtreme",
    },
  },
  {
    id: "trivia",
    label: "Trivia",
    color: "var(--wheel-trivia)",
    title: "Trivia Time!",
    outcomes: {
      normal: "trivia",
    },
  },
];

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const HAPTIC_PATTERNS = {
  light: 18,
  medium: [28, 24, 28],
  heavy: [60, 45, 60],
};

const confettiBurst = () => {
  const colors = ["#a855f7", "#38bdf8", "#f472b6", "#fde68a"];
  const end = Date.now() + 1200;

  const frame = () => {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
};

const getOrCreatePlayerId = () => {
  if (typeof window === "undefined") {
    return "local-player";
  }

  try {
    const stored = window.localStorage?.getItem(PLAYER_STORAGE_KEY);
    if (stored) {
      return stored;
    }

    const generated = `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    window.localStorage?.setItem(PLAYER_STORAGE_KEY, generated);
    return generated;
  } catch (error) {
    console.warn("Failed to create persistent player id", error);
    return `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
};

const createRandomGameId = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

const parseNumber = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function App() {
  const [toneReady, setToneReady] = useState(false);
  const [inputGameId, setInputGameId] = useState("");
  const [playerId] = useState(getOrCreatePlayerId);
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const stored = window.localStorage?.getItem(STORAGE_KEYS.mode);
      return stored ?? null;
    } catch (error) {
      console.warn("Failed to restore stored mode", error);
      return null;
    }
  });
  const isSingleDeviceMode = mode === "single-device";
  const isOfflineMode = mode === "offline";
  const [modeInitialized, setModeInitialized] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [pendingExtremeSpin, setPendingExtremeSpin] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState({
    title: "",
    text: "",
    type: "",
    intensity: "normal",
  });
  const [currentConsequence, setCurrentConsequence] = useState({
    text: "",
    intensity: "normal",
  });
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState(BASE_SPIN_DURATION_MS);
  const [isExtremeRound, setIsExtremeRound] = useState(false);
  const [pendingPromptSounds, setPendingPromptSounds] = useState([]);
  const [pendingConsequenceSounds, setPendingConsequenceSounds] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [soundPulse, setSoundPulse] = useState(false);
  const [isLoopingSound, setIsLoopingSound] = useState(false);
  const [extremePulseLevel, setExtremePulseLevel] = useState(0);
  const [generatedPrompts, setGeneratedPrompts] = usePersistentState(
    STORAGE_KEYS.generatedPrompts,
    generatePromptSet(),
    {
      serialize: JSON.stringify,
      deserialize: (value) => {
        try {
          const parsed = JSON.parse(value);
          return parsed && typeof parsed === "object"
            ? parsed
            : generatePromptSet();
        } catch (error) {
          console.warn("Failed to parse cached generated prompts", error);
          return generatePromptSet();
        }
      },
    }
  );
  const [debugAnalyticsEnabled, setDebugAnalyticsEnabled] = usePersistentState(
    STORAGE_KEYS.debugAnalytics,
    false,
    {
      serialize: (value) => JSON.stringify(Boolean(value)),
      deserialize: (value) => {
        try {
          return JSON.parse(value);
        } catch (error) {
          console.warn("Failed to restore debug analytics preference", error);
          return false;
        }
      },
    }
  );
  const [roundTimer, setRoundTimer] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const regenerateGeneratedPrompts = useCallback(() => {
    setGeneratedPrompts(generatePromptSet());
  }, [setGeneratedPrompts]);
  const rotationRef = useRef(0);
  const spinTimeoutRef = useRef(null);
  const pendingSpinRef = useRef(null);
  const copyFeedbackTimeoutRef = useRef(null);
  const soundPulseTimeoutRef = useRef(null);
  const meterForcedExtremeRef = useRef(false);
  const timerRef = useRef(null);
  const timerExpiredRef = useRef(false);
  const timerStopReasonRef = useRef(null);
  const swipeStateRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    peakVelocity: 0,
  });
  const remoteModeRef = useRef(null);
  const previousModalRef = useRef(null);
  const offlineSessionHydratedRef = useRef(false);
  const offlinePromptsHydratedRef = useRef(false);

  const [gameId, setGameId] = usePersistentState(STORAGE_KEYS.gameId, null, {
    serialize: (value) => value ?? "",
    deserialize: (value) => (value ? value : null),
  });
  const [musicVolume, setMusicVolume] = usePersistentState(
    STORAGE_KEYS.musicVolume,
    0.2,
    {
      serialize: (value) => value.toString(),
      deserialize: (value) => parseNumber(value, 0.2),
    }
  );
  const [sfxVolume, setSfxVolume] = usePersistentState(
    STORAGE_KEYS.sfxVolume,
    0.5,
    {
      serialize: (value) => value.toString(),
      deserialize: (value) => parseNumber(value, 0.5),
    }
  );
  const [roundCount, setRoundCount] = usePersistentState(
    STORAGE_KEYS.roundCount,
    0,
    {
      serialize: (value) => value.toString(),
      deserialize: (value) => parseInteger(value, 0),
    }
  );
  const [extremeMeter, setExtremeMeter] = usePersistentState(
    STORAGE_KEYS.extremeMeter,
    0,
    {
      serialize: (value) => value.toString(),
      deserialize: (value) => parseInteger(value, 0),
    }
  );
  const [lastPrompts, setLastPrompts] = usePersistentState(
    STORAGE_KEYS.lastPrompts,
    {},
    {
      serialize: JSON.stringify,
      deserialize: (value) => {
        try {
          const parsed = JSON.parse(value);
          return parsed && typeof parsed === "object" ? parsed : {};
        } catch (error) {
          console.warn("Failed to parse stored prompt history", error);
          return {};
        }
      },
    }
  );

  const remoteDb = isOfflineMode ? null : db;
  const promptsGameId = isOfflineMode ? null : gameId;

  const {
    events: analyticsEvents,
    trackEvent: logAnalyticsEvent,
    trackSpin: logSpinEvent,
    trackOutcome: logOutcomeEvent,
    trackTimer: logTimerEvent,
    trackExtremeMeter: logExtremeMeterEvent,
  } = useAnalytics(gameId, {
    mode,
    playerId,
    db: remoteDb,
    debug: debugAnalyticsEnabled,
  });

  const {
    badges: playerBadges,
    adrenaline: playerAdrenaline,
    recordEvent: recordPlayerEvent,
  } = usePlayerStats({ gameId, playerId, mode, db: remoteDb });

  const {
    prompts,
    savePrompts,
    promptGroups: customPromptGroups,
    isLoading: promptsLoading,
    error: promptsError,
    retry: retryPrompts,
  } = usePrompts(promptsGameId);
  const generatedPromptGroups = useMemo(
    () => buildPromptGroups(generatedPrompts),
    [generatedPrompts]
  );
  const promptGroups = useMemo(
    () => ({
      truth: [
        ...generatedPromptGroups.truth,
        ...(customPromptGroups?.truth ?? []),
      ],
      spicyTruth: [
        ...generatedPromptGroups.spicyTruth,
        ...(customPromptGroups?.spicyTruth ?? []),
      ],
      truthExtreme: [
        ...generatedPromptGroups.truthExtreme,
        ...(customPromptGroups?.truthExtreme ?? []),
      ],
      dare: [
        ...generatedPromptGroups.dare,
        ...(customPromptGroups?.dare ?? []),
      ],
      spicyDare: [
        ...generatedPromptGroups.spicyDare,
        ...(customPromptGroups?.spicyDare ?? []),
      ],
      dareExtreme: [
        ...generatedPromptGroups.dareExtreme,
        ...(customPromptGroups?.dareExtreme ?? []),
      ],
      trivia: [
        ...generatedPromptGroups.trivia,
        ...(customPromptGroups?.trivia ?? []),
      ],
      consequenceNormal: [
        ...generatedPromptGroups.consequenceNormal,
        ...(customPromptGroups?.consequenceNormal ?? []),
      ],
      consequenceSpicy: [
        ...generatedPromptGroups.consequenceSpicy,
        ...(customPromptGroups?.consequenceSpicy ?? []),
      ],
      consequenceExtreme: [
        ...generatedPromptGroups.consequenceExtreme,
        ...(customPromptGroups?.consequenceExtreme ?? []),
      ],
    }),
    [customPromptGroups, generatedPromptGroups]
  );
  useEffect(() => {
    if (typeof window === "undefined" || !modeInitialized || !mode) {
      return;
    }

    try {
      window.localStorage?.setItem(STORAGE_KEYS.mode, mode);
    } catch (error) {
      console.warn("Failed to persist mode selection", error);
    }
  }, [mode, modeInitialized]);
  useEffect(() => {
    if (!remoteDb || !gameId) {
      remoteModeRef.current = null;
      setModeInitialized(true);
      return undefined;
    }

    setModeInitialized(false);

    const unsubscribe = subscribeToSessionMode(remoteDb, gameId, (nextMode) => {
      remoteModeRef.current = nextMode ?? null;
      if (nextMode) {
        setMode((currentMode) =>
          currentMode === nextMode ? currentMode : nextMode
        );
      }

      setModeInitialized(true);
    });

    return () => {
      remoteModeRef.current = null;
      unsubscribe();
    };
  }, [gameId, remoteDb]);
  useEffect(() => {
    if (
      !modeInitialized ||
      !remoteDb ||
      !gameId ||
      !mode
    ) {
      return;
    }

    if (remoteModeRef.current === mode) {
      return;
    }

    setSessionMode(remoteDb, gameId, mode).catch(() => {});
  }, [gameId, mode, modeInitialized, remoteDb]);
  useEffect(() => {
    if (!gameId) {
      return;
    }

    regenerateGeneratedPrompts();
  }, [gameId, regenerateGeneratedPrompts]);

  useEffect(() => {
    if (!isOfflineMode) {
      offlineSessionHydratedRef.current = false;
      return;
    }

    if (!gameId || offlineSessionHydratedRef.current) {
      return;
    }

    const stored = loadOffline(OFFLINE_SESSION_KEY, null);
    if (!stored || typeof stored !== "object") {
      offlineSessionHydratedRef.current = true;
      return;
    }

    if (Number.isFinite(stored.roundCount)) {
      setRoundCount(stored.roundCount);
    }
    if (Number.isFinite(stored.extremeMeter)) {
      setExtremeMeter(stored.extremeMeter);
    }
    if (stored.lastPrompts && typeof stored.lastPrompts === "object") {
      setLastPrompts(stored.lastPrompts);
    }
    if (stored.currentPrompt && typeof stored.currentPrompt === "object") {
      setCurrentPrompt((previous) => ({ ...previous, ...stored.currentPrompt }));
    }
    if (stored.currentConsequence && typeof stored.currentConsequence === "object") {
      setCurrentConsequence((previous) => ({
        ...previous,
        ...stored.currentConsequence,
      }));
    }
    if (Number.isFinite(stored.rotation)) {
      setRotation(stored.rotation);
      rotationRef.current = stored.rotation;
    }
    if (typeof stored.pendingExtremeSpin === "boolean") {
      setPendingExtremeSpin(stored.pendingExtremeSpin);
    }
    if (typeof stored.isExtremeRound === "boolean") {
      setIsExtremeRound(stored.isExtremeRound);
    }
    if (typeof stored.timerActive === "boolean") {
      setTimerActive(stored.timerActive);
    }
    if (Number.isFinite(stored.roundTimer)) {
      setRoundTimer(stored.roundTimer);
    }

    offlineSessionHydratedRef.current = true;
  }, [
    gameId,
    isOfflineMode,
    setCurrentConsequence,
    setCurrentPrompt,
    setExtremeMeter,
    setLastPrompts,
    setRoundCount,
    setIsExtremeRound,
    setPendingExtremeSpin,
    setRotation,
    setRoundTimer,
    setTimerActive,
  ]);

  useEffect(() => {
    if (!isOfflineMode || !gameId) {
      return;
    }

    if (!offlineSessionHydratedRef.current) {
      return;
    }

    const payload = {
      roundCount,
      extremeMeter,
      lastPrompts,
      currentPrompt,
      currentConsequence,
      rotation,
      pendingExtremeSpin,
      isExtremeRound,
      timerActive,
      roundTimer,
    };
    saveOffline(OFFLINE_SESSION_KEY, payload);
  }, [
    currentConsequence,
    currentPrompt,
    extremeMeter,
    gameId,
    isExtremeRound,
    isOfflineMode,
    lastPrompts,
    pendingExtremeSpin,
    roundCount,
    roundTimer,
    rotation,
    timerActive,
  ]);

  useEffect(() => {
    if (!isOfflineMode) {
      offlinePromptsHydratedRef.current = false;
      return;
    }

    if (offlinePromptsHydratedRef.current) {
      return;
    }

    const stored = loadOffline(OFFLINE_PROMPTS_KEY, null);
    if (stored && typeof stored === "object") {
      if (stored.generatedPrompts) {
        setGeneratedPrompts(stored.generatedPrompts);
      }
      if (stored.prompts) {
        savePrompts(stored.prompts);
      }
    }

    offlinePromptsHydratedRef.current = true;
  }, [isOfflineMode, savePrompts, setGeneratedPrompts]);

  useEffect(() => {
    if (!isOfflineMode || !prompts) {
      return;
    }

    if (!offlinePromptsHydratedRef.current) {
      return;
    }

    saveOffline(OFFLINE_PROMPTS_KEY, {
      prompts,
      generatedPrompts,
      updatedAt: Date.now(),
    });
  }, [generatedPrompts, isOfflineMode, prompts]);

  const shouldPlayMusic = Boolean(gameId) && toneReady && musicVolume > 0;
  const { stop: stopMusic } = useBackgroundMusic(
    musicVolume,
    shouldPlayMusic,
    toneReady
  );
  const { play, startLoop, stopLoop } = useSound(sfxVolume, toneReady);

  const stopRoundTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerActive(false);
    timerExpiredRef.current = false;
  }, []);

  const flashSoundActivity = useCallback(() => {
    if (sfxVolume <= 0) {
      return;
    }

    setSoundPulse(true);
    if (soundPulseTimeoutRef.current) {
      window.clearTimeout(soundPulseTimeoutRef.current);
    }
    soundPulseTimeoutRef.current = window.setTimeout(() => {
      setSoundPulse(false);
      soundPulseTimeoutRef.current = null;
    }, 420);
  }, [sfxVolume]);

  useEffect(() => {
    return () => {
      if (soundPulseTimeoutRef.current) {
        window.clearTimeout(soundPulseTimeoutRef.current);
      }
      if (copyFeedbackTimeoutRef.current) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sfxVolume > 0) {
      return;
    }

    setSoundPulse(false);
    setIsLoopingSound(false);
    if (soundPulseTimeoutRef.current) {
      window.clearTimeout(soundPulseTimeoutRef.current);
      soundPulseTimeoutRef.current = null;
    }
  }, [sfxVolume]);

  const triggerSound = useCallback(
    (soundName) => {
      flashSoundActivity();
      play(soundName);
    },
    [flashSoundActivity, play]
  );

  const triggerHapticFeedback = useCallback(
    (pattern = HAPTIC_PATTERNS.light) => {
      if (typeof window === "undefined") {
        return;
      }

      const prefersCoarsePointer =
        window.matchMedia?.("(pointer: coarse)")?.matches ||
        window.matchMedia?.("(any-pointer: coarse)")?.matches;

      if (!prefersCoarsePointer) {
        return;
      }

      const { navigator } = window;
      if (!navigator?.vibrate) {
        return;
      }

      const vibrationPattern = pattern ?? HAPTIC_PATTERNS.light;
      if (vibrationPattern === null || vibrationPattern === undefined) {
        return;
      }

      navigator.vibrate(vibrationPattern);
    },
    []
  );

  const playClick = useCallback(() => {
    triggerSound("click");
    triggerHapticFeedback(HAPTIC_PATTERNS.light);
  }, [triggerHapticFeedback, triggerSound]);

  const triggerTimerVibration = useCallback((pattern, label) => {
    if (typeof window === "undefined") {
      console.log(`Timer vibration fallback (${label}):`, pattern);
      return;
    }

    const { navigator } = window;

    if (navigator && "vibrate" in navigator) {
      navigator.vibrate(pattern);
      return;
    }

    console.log(`Timer vibration fallback (${label}):`, pattern);
  }, []);

  const startSoundLoop = useCallback(() => {
    if (sfxVolume > 0) {
      setIsLoopingSound(true);
      flashSoundActivity();
    }
    startLoop();
  }, [flashSoundActivity, sfxVolume, startLoop]);

  const stopSoundLoop = useCallback(() => {
    setIsLoopingSound(false);
    stopLoop();
  }, [stopLoop]);

  useEffect(() => {
    let cancelled = false;

    const markReady = () => {
      if (!cancelled) {
        setToneReady(true);
      }
    };

    if (window.Tone) {
      markReady();
      return () => {
        cancelled = true;
      };
    }

    const toneScript = document.querySelector('script[src*="tone"]');

    if (toneScript) {
      const handleReady = () => {
        markReady();
      };

      toneScript.addEventListener("load", handleReady, { once: true });
      toneScript.addEventListener("error", handleReady, { once: true });

      return () => {
        cancelled = true;
        toneScript.removeEventListener("load", handleReady);
        toneScript.removeEventListener("error", handleReady);
      };
    }

    import("tone")
      .then((module) => {
        if (cancelled) {
          return;
        }
        const Tone = module?.default ?? module;
        if (Tone && !window.Tone) {
          window.Tone = Tone;
        }
        markReady();
      })
      .catch((error) => {
        console.warn("Failed to dynamically load Tone.js", error);
        markReady();
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toneReady || !window.Tone) {
      return undefined;
    }

    const resumeContext = async () => {
      try {
        await window.Tone.start();
        if (window.Tone.context.state === "suspended") {
          await window.Tone.context.resume();
        }
        if (window.Tone.Transport.state !== "started") {
          window.Tone.Transport.start();
        }
      } catch (error) {
        console.warn("Unable to start Tone.js audio context", error);
      }
    };

    const handleInteraction = () => {
      resumeContext();
    };

    document.addEventListener("pointerdown", handleInteraction, { once: true });
    document.addEventListener("keydown", handleInteraction, { once: true });

    return () => {
      document.removeEventListener("pointerdown", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, [toneReady]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
      pendingSpinRef.current = null;
      stopSoundLoop();
      stopRoundTimer();
    };
  }, [stopRoundTimer, stopSoundLoop]);

  useEffect(() => {
    if (!pendingExtremeSpin) {
      setExtremePulseLevel(0);
      return;
    }

    setExtremePulseLevel(1);
    const interval = window.setInterval(() => {
      setExtremePulseLevel((previous) => {
        if (previous >= 4) {
          return 4;
        }
        return previous + 1;
      });
    }, 1400);

    return () => {
      window.clearInterval(interval);
    };
  }, [pendingExtremeSpin]);

  useEffect(() => {
    const previous = previousModalRef.current;

    if (activeModal === "prompt") {
      setRoundTimer(30);
      timerExpiredRef.current = false;
      setTimerActive(true);
      if (previous !== "prompt") {
        logTimerEvent({
          state: "start",
          duration: 30,
          promptType: currentPrompt.type,
          intensity: currentPrompt.intensity,
          round: roundCount,
        });
      }
    } else {
      if (previous === "prompt") {
        const pendingReason = timerStopReasonRef.current;
        timerStopReasonRef.current = null;
        if (pendingReason !== "skip") {
          logTimerEvent({
            state: "stop",
            reason: pendingReason ?? "modal-closed",
            remaining: roundTimer,
            promptType: currentPrompt.type,
            intensity: currentPrompt.intensity,
          });
        }
      }
      stopRoundTimer();
      setRoundTimer(30);
    }

    previousModalRef.current = activeModal;
  }, [
    activeModal,
    currentPrompt.intensity,
    currentPrompt.type,
    logTimerEvent,
    roundCount,
    roundTimer,
    stopRoundTimer,
  ]);

  useEffect(() => {
    if (!timerActive) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      setRoundTimer((previous) => {
        if (previous <= 0) {
          return previous;
        }

        const nextValue = previous - 1;

        play("timerTick");
        triggerTimerVibration(50, "tick");

        if (nextValue <= 5) {
          play("timerWarning");
        }

        if (nextValue <= 0) {
          play("timerEnd");
          triggerTimerVibration([100, 50, 100], "final");
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          timerExpiredRef.current = true;
          setTimerActive(false);
          logTimerEvent({
            state: "timeout",
            promptType: currentPrompt.type,
            intensity: currentPrompt.intensity,
            round: roundCount,
          });
          return 0;
        }

        return nextValue;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    currentPrompt.intensity,
    currentPrompt.type,
    logTimerEvent,
    play,
    roundCount,
    timerActive,
    triggerTimerVibration,
  ]);

  useEffect(() => {
    if (!timerActive && activeModal === "prompt" && timerExpiredRef.current) {
      timerExpiredRef.current = false;
      handleRefuse("timeout");
    }
  }, [activeModal, handleRefuse, timerActive]);

  useEffect(() => {
    if (timerActive) {
      console.log("Round timer:", roundTimer);
    }
  }, [roundTimer, timerActive]);

  const choosePrompt = useCallback(
    (outcomeKey) => {
      const pool = promptGroups[outcomeKey] ?? [];
      if (!pool.length) {
        return "No prompts available for this category.";
      }

      const recentHistory = (lastPrompts?.[outcomeKey] ?? []).slice(
        -MAX_RECENT_PROMPTS
      );
      const recentSet = new Set(recentHistory);
      const freshOptions = pool.filter((prompt) => !recentSet.has(prompt));
      const selectionPool = freshOptions.length > 0 ? freshOptions : pool;

      const index = Math.floor(Math.random() * selectionPool.length);
      return selectionPool[index] ?? pool[0];
    },
    [lastPrompts, promptGroups]
  );

  const recordPromptHistory = useCallback(
    (outcomeKey, promptText) => {
      setLastPrompts((previous) => {
        const history = { ...(previous ?? {}) };
        const updated = [...(history[outcomeKey] ?? []), promptText].slice(
          -MAX_RECENT_PROMPTS
        );
        return { ...history, [outcomeKey]: updated };
      });
    },
    [setLastPrompts]
  );

  const concludeSpin = useCallback(
    (segment, outcomeKey, flags) => {
      const promptText = choosePrompt(outcomeKey);
      recordPromptHistory(outcomeKey, promptText);

      const intensity = flags.isExtreme
        ? "extreme"
        : flags.isSpicy
        ? "spicy"
        : "normal";
      const nextRoundNumber = roundCount + 1;
      const extremeTrigger = flags.isExtreme
        ? meterForcedExtremeRef.current
          ? "meter"
          : "random"
        : null;

      recordPlayerEvent("round-start", {
        promptType: segment.id,
        isExtreme: flags.isExtreme,
      });

      setCurrentPrompt({
        title: segment.title,
        text: promptText,
        type: segment.id,
        intensity,
      });
      const sounds = [];
      if (flags.isExtreme) {
        sounds.push("extremeWooo");
      } else if (flags.isSpicy) {
        sounds.push("spicyGiggle");
      }
      setPendingPromptSounds(sounds);
      setActiveModal("prompt");
      setIsSpinning(false);
      triggerHapticFeedback(
        flags.isExtreme ? HAPTIC_PATTERNS.heavy : HAPTIC_PATTERNS.light
      );
      setIsExtremeRound(flags.isExtreme);
      setRoundCount((value) => value + 1);

      logAnalyticsEvent("roundStart", {
        round: nextRoundNumber,
        segmentId: segment.id,
        outcomeKey,
        intensity,
        isExtremeRound: flags.isExtreme,
        isSpicyRound: flags.isSpicy,
      });

      if (flags.isExtreme) {
        logAnalyticsEvent("extremeRound", {
          round: nextRoundNumber,
          segmentId: segment.id,
          trigger: extremeTrigger,
        });
        if (meterForcedExtremeRef.current) {
          meterForcedExtremeRef.current = false;
        } else {
          const nextMeter = Math.min(100, extremeMeter + 20);
          console.log("Extreme meter:", nextMeter);
          setExtremeMeter(nextMeter);
          logExtremeMeterEvent({
            action: "increment",
            value: nextMeter,
            delta: nextMeter - extremeMeter,
            round: nextRoundNumber,
            reason: "random-extreme",
          });
        }
      } else {
        const nextMeter = Math.min(100, extremeMeter + 20);
        console.log("Extreme meter:", nextMeter);
        setExtremeMeter(nextMeter);
        logExtremeMeterEvent({
          action: "increment",
          value: nextMeter,
          delta: nextMeter - extremeMeter,
          round: nextRoundNumber,
        });
      }
    },
    [
      choosePrompt,
      extremeMeter,
      logAnalyticsEvent,
      logExtremeMeterEvent,
      recordPlayerEvent,
      recordPromptHistory,
      roundCount,
      setExtremeMeter,
      setRoundCount,
      triggerHapticFeedback,
    ]
  );

  const determineOutcome = useCallback((segment, forceExtreme) => {
    const possibleOutcomes = forceExtreme
      ? ["extreme"]
      : Object.keys(segment.outcomes);

    const selection = pickRandom(possibleOutcomes);
    const outcomeKey =
      segment.outcomes[selection] ?? segment.outcomes.normal ?? "";

    return {
      outcomeKey,
      isSpicy: selection === "spicy",
      isExtreme: selection === "extreme" || forceExtreme,
    };
  }, []);

  const finalizeSpin = useCallback(() => {
    const sliceCount = WHEEL_SEGMENTS.length;
    if (!sliceCount) {
      pendingSpinRef.current = null;
      setIsSpinning(false);
      return;
    }

    const sliceAngle = 360 / sliceCount;
    const normalizedRotation = ((rotationRef.current % 360) + 360) % 360;
    const landingAngle = (360 - normalizedRotation) % 360;
    let landingIndex = Math.floor(landingAngle / sliceAngle);

    if (!Number.isFinite(landingIndex)) {
      landingIndex = 0;
    }

    landingIndex = Math.max(0, Math.min(sliceCount - 1, landingIndex));
    const segment = WHEEL_SEGMENTS[landingIndex] ?? WHEEL_SEGMENTS[0];
    const pending = pendingSpinRef.current;
    const forceExtreme = pending?.forceExtreme ?? false;
    const outcomeInfo =
      pending && pending.selectedIndex === landingIndex && pending.outcome
        ? pending.outcome
        : determineOutcome(segment, forceExtreme);

    pendingSpinRef.current = null;
    concludeSpin(segment, outcomeInfo.outcomeKey, outcomeInfo);
  }, [concludeSpin, determineOutcome, setIsSpinning]);

  const startSpin = useCallback(
    (forceExtreme, swipeStrength = MAX_SWIPE_STRENGTH / 2) => {
      const clampedStrength = Math.min(
        Math.max(
          Number.isFinite(swipeStrength)
            ? swipeStrength
            : MAX_SWIPE_STRENGTH / 2,
          0
        ),
        MAX_SWIPE_STRENGTH
      );
      const effectiveStrength = Math.max(clampedStrength, MIN_SWIPE_STRENGTH);
      const normalizedStrength =
        MAX_SWIPE_STRENGTH > 0 ? effectiveStrength / MAX_SWIPE_STRENGTH : 0.5;
      const sliceCount = WHEEL_SEGMENTS.length;
      if (!sliceCount) {
        return;
      }

      const availableIndexes = forceExtreme
        ? Array.from({ length: Math.min(sliceCount, 2) }, (_, index) => index)
        : WHEEL_SEGMENTS.map((_, index) => index);
      const selectedIndex =
        availableIndexes[Math.floor(Math.random() * availableIndexes.length)] ??
        0;
      const sliceAngle = 360 / sliceCount;
      const selectedSegment = WHEEL_SEGMENTS[selectedIndex];
      const outcome = determineOutcome(selectedSegment, forceExtreme);
      pendingSpinRef.current = {
        forceExtreme,
        selectedIndex,
        outcome,
      };
      logSpinEvent({
        round: roundCount + 1,
        forceExtreme,
        selectedIndex,
        segmentId: selectedSegment?.id ?? null,
        swipeStrength: normalizedStrength,
        outcomeKey: outcome.outcomeKey,
        isExtreme: outcome.isExtreme,
        isSpicy: outcome.isSpicy,
      });
      const randomOffset = (Math.random() - 0.5) * sliceAngle * 0.6;
      const targetAngle =
        -(selectedIndex * sliceAngle + sliceAngle / 2) + randomOffset;
      const minDuration = BASE_SPIN_DURATION_MS * 0.75;
      const maxDuration = BASE_SPIN_DURATION_MS * 1.85;
      const spinDurationMs =
        minDuration + (maxDuration - minDuration) * normalizedStrength;
      const totalExtraRotations =
        MIN_EXTRA_ROTATIONS +
        (MAX_EXTRA_ROTATIONS - MIN_EXTRA_ROTATIONS) * normalizedStrength;
      const extraSpins = totalExtraRotations * 360;

      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }

      setIsSpinning(true);
      setIsExtremeRound(outcome.isExtreme);
      startSoundLoop();
      triggerHapticFeedback(HAPTIC_PATTERNS.medium);
      setSpinDuration(spinDurationMs);

      const baseRotation = rotationRef.current - (rotationRef.current % 360);
      const finalRotation = baseRotation + extraSpins + targetAngle;
      rotationRef.current = finalRotation;
      setRotation(finalRotation);

      spinTimeoutRef.current = window.setTimeout(() => {
        stopSoundLoop();
        finalizeSpin();
        spinTimeoutRef.current = null;
      }, spinDurationMs);
    },
    [
      determineOutcome,
      finalizeSpin,
      logSpinEvent,
      roundCount,
      setSpinDuration,
      startSoundLoop,
      stopSoundLoop,
      triggerHapticFeedback,
    ]
  );

  const handleSpin = useCallback(() => {
    if (isSpinning) {
      return;
    }

    if (extremeMeter >= 100) {
      meterForcedExtremeRef.current = true;
      const previousMeter = extremeMeter;
      const nextMeterValue = 0;
      console.log("Extreme meter:", nextMeterValue);
      setExtremeMeter(nextMeterValue);
      logExtremeMeterEvent({
        action: "reset",
        reason: "meter-trigger",
        previous: previousMeter,
        value: nextMeterValue,
      });
      startSpin(true);
      return;
    }

    const isExtreme = Math.random() < EXTREME_ROUND_CHANCE;

    if (isExtreme) {
      logAnalyticsEvent("extremeRound", {
        round: roundCount + 1,
        trigger: "random",
        status: "announcement",
      });
      setPendingExtremeSpin(true);
      setActiveModal("announcement");
      return;
    }

    startSpin(false);
  }, [
    extremeMeter,
    isSpinning,
    logAnalyticsEvent,
    logExtremeMeterEvent,
    roundCount,
    setExtremeMeter,
    startSpin,
  ]);

  const resetSwipeState = useCallback(() => {
    swipeStateRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      startTime: 0,
      lastX: 0,
      lastY: 0,
      lastTime: 0,
      peakVelocity: 0,
    };
  }, []);

  const handleWheelPointerDown = useCallback(
    (event) => {
      if (isSpinning || event.target.closest(".spin-button__trigger")) {
        return;
      }

      event.preventDefault();
      const { pointerId, clientX, clientY, timeStamp, currentTarget } = event;
      currentTarget.setPointerCapture(pointerId);
      swipeStateRef.current = {
        active: true,
        pointerId,
        startX: clientX,
        startY: clientY,
        startTime: timeStamp,
        lastX: clientX,
        lastY: clientY,
        lastTime: timeStamp,
        peakVelocity: 0,
      };
    },
    [isSpinning]
  );

  const handleWheelPointerMove = useCallback((event) => {
    const state = swipeStateRef.current;
    if (!state.active || event.pointerId !== state.pointerId) {
      return;
    }

    const { clientX, clientY, timeStamp } = event;
    const deltaX = clientX - state.lastX;
    const deltaY = clientY - state.lastY;
    const deltaTime = Math.max(timeStamp - state.lastTime, 1);

    const distance = Math.hypot(deltaX, deltaY);
    const velocity = deltaTime > 0 ? distance / deltaTime : 0;

    state.lastX = clientX;
    state.lastY = clientY;
    state.lastTime = timeStamp;
    state.peakVelocity = Math.max(state.peakVelocity, velocity);
  }, []);

  const handleWheelPointerEnd = useCallback(
    (event) => {
      const state = swipeStateRef.current;
      if (!state.active || event.pointerId !== state.pointerId) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const totalDistance = Math.hypot(
        event.clientX - state.startX,
        event.clientY - state.startY
      );
      const duration = Math.max(event.timeStamp - state.startTime, 1);
      const averageVelocity = totalDistance / duration;
      const peakVelocity = Math.max(state.peakVelocity, averageVelocity);

      resetSwipeState();

      if (isSpinning) {
        return;
      }

      const normalizedDistance = Math.min(
        totalDistance / 220,
        MAX_SWIPE_STRENGTH
      );
      const normalizedVelocity = Math.min(
        peakVelocity / 1.2,
        MAX_SWIPE_STRENGTH
      );
      const rawStrength = normalizedDistance * 0.55 + normalizedVelocity * 0.85;
      const strength = Math.max(
        Math.min(rawStrength, MAX_SWIPE_STRENGTH),
        totalDistance >= MIN_SWIPE_DISTANCE
          ? MIN_SWIPE_STRENGTH
          : MIN_SWIPE_STRENGTH * 0.85
      );

      startSpin(false, strength);
    },
    [isSpinning, resetSwipeState, startSpin]
  );

  const handleWheelPointerCancel = useCallback(
    (event) => {
      const state = swipeStateRef.current;
      if (state.active && event.pointerId === state.pointerId) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        resetSwipeState();
      }
    },
    [resetSwipeState]
  );

  const handleAnnouncementClose = useCallback(() => {
    setActiveModal(null);
    if (pendingExtremeSpin) {
      setPendingExtremeSpin(false);
      startSpin(true);
    }
  }, [pendingExtremeSpin, startSpin]);

  const handleRefuse = useCallback(
    (reason = "refused") => {
      stopRoundTimer();
      const levels = ["normal", "spicy", "extreme"];
      const selection = pickRandom(levels);

      const keyMap = {
        normal: "consequenceNormal",
        spicy: "consequenceSpicy",
        extreme: "consequenceExtreme",
      };
      const pool = promptGroups[keyMap[selection]] ?? [];
      const consequence = pool.length
        ? pickRandom(pool)
        : "No consequences available. You're safe this time!";

      const sounds = ["refusalBoo"];
      if (selection === "spicy") {
        sounds.push("spicyGiggle");
      }
      if (selection === "extreme") {
        sounds.push("extremeWooo");
      }
      setPendingConsequenceSounds(sounds);
      setCurrentConsequence({ text: consequence, intensity: selection });
      setActiveModal("consequence");

      const outcomeResult =
        reason === "timeout"
          ? "timeout"
          : currentPrompt.type === "trivia"
          ? "incorrect"
          : "refused";
      logOutcomeEvent({
        result: outcomeResult,
        promptType: currentPrompt.type,
        promptIntensity: currentPrompt.intensity,
        consequenceIntensity: selection,
        round: roundCount,
      });

      if (reason === "timeout") {
        recordPlayerEvent("timeout", { promptType: currentPrompt.type });
      } else if (currentPrompt.type === "trivia") {
        recordPlayerEvent("trivia-incorrect", { promptType: currentPrompt.type });
      } else {
        recordPlayerEvent("refusal", { promptType: currentPrompt.type });
      }

      timerStopReasonRef.current = outcomeResult;
    },
    [
      currentPrompt.intensity,
      currentPrompt.type,
      logOutcomeEvent,
      recordPlayerEvent,
      promptGroups,
      roundCount,
      stopRoundTimer,
    ]
  );

  useEffect(() => {
    if (activeModal === "announcement") {
      triggerSound("fanfare");
      confettiBurst();
    }
  }, [activeModal, triggerSound]);

  useEffect(() => {
    if (activeModal === "prompt" && pendingPromptSounds.length) {
      pendingPromptSounds.forEach((sound) => triggerSound(sound));
      setPendingPromptSounds([]);
    }
  }, [activeModal, pendingPromptSounds, triggerSound]);

  useEffect(() => {
    if (activeModal === "consequence" && pendingConsequenceSounds.length) {
      pendingConsequenceSounds.forEach((sound) => triggerSound(sound));
      setPendingConsequenceSounds([]);
    }
  }, [activeModal, pendingConsequenceSounds, triggerSound]);

  const createNewGame = useCallback(() => {
    const newId = isOfflineMode ? OFFLINE_GAME_ID : createRandomGameId();
    setGameId(newId);
    setRoundCount(0);
    setLastPrompts({});
  }, [isOfflineMode, setGameId, setLastPrompts, setRoundCount]);

  const joinGame = useCallback(
    (event) => {
      event.preventDefault();
      const trimmed = inputGameId.trim().toUpperCase();
      if (!trimmed) {
        return;
      }
      setGameId(trimmed);
      setRoundCount(0);
      setLastPrompts({});
    },
    [inputGameId, setGameId, setLastPrompts, setRoundCount]
  );

  const resetInputGameId = useCallback(() => {
    setInputGameId("");
  }, [setInputGameId]);

  const copyGameId = useCallback(async () => {
    if (!gameId || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(gameId);
      setCopySuccess(true);
      if (copyFeedbackTimeoutRef.current) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
      copyFeedbackTimeoutRef.current = window.setTimeout(() => {
        setCopySuccess(false);
        copyFeedbackTimeoutRef.current = null;
      }, 2000);
    } catch (error) {
      console.warn("Failed to copy game id", error);
      setCopySuccess(false);
    }
  }, [gameId]);

  const handleCopyGameIdClick = useCallback(() => {
    playClick();
    copyGameId();
  }, [copyGameId, playClick]);

  const resetGameState = useCallback(() => {
    stopMusic();
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }
    spinTimeoutRef.current = null;
    pendingSpinRef.current = null;
    setIsSpinning(false);
    stopSoundLoop();
    stopRoundTimer();
    setSoundPulse(false);
    if (copyFeedbackTimeoutRef.current) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
      copyFeedbackTimeoutRef.current = null;
    }
    if (soundPulseTimeoutRef.current) {
      window.clearTimeout(soundPulseTimeoutRef.current);
      soundPulseTimeoutRef.current = null;
    }
    timerStopReasonRef.current = null;
    previousModalRef.current = null;
    setIsExtremeRound(false);
    setRotation(0);
    rotationRef.current = 0;
    setMode(null);
    setGameId(null);
    setRoundCount(0);
    setLastPrompts({});
    setCurrentPrompt({ title: "", text: "", type: "", intensity: "normal" });
    setCurrentConsequence({ text: "", intensity: "normal" });
    setInputGameId("");
    setCopySuccess(false);
    regenerateGeneratedPrompts();
  }, [
    regenerateGeneratedPrompts,
    setGameId,
    setLastPrompts,
    setRoundCount,
    stopMusic,
    stopSoundLoop,
  ]);

  const handleResetGame = useCallback(() => {
    playClick();
    resetGameState();
  }, [playClick, resetGameState]);

  const closeModal = useCallback(() => {
    setActiveModal((previous) => {
      if (previous === "prompt") {
        stopRoundTimer();
        setIsExtremeRound(false);
      }
      return null;
    });
  }, [stopRoundTimer]);

  const handlePromptAccept = useCallback(() => {
    const outcomeResult =
      currentPrompt.type === "trivia" ? "correct" : "accepted";
    logOutcomeEvent({
      result: outcomeResult,
      promptType: currentPrompt.type,
      promptIntensity: currentPrompt.intensity,
      round: roundCount,
    });
    if (currentPrompt.type === "trivia") {
      recordPlayerEvent("trivia-correct", { promptType: currentPrompt.type });
    } else {
      recordPlayerEvent("round-success", { promptType: currentPrompt.type });
    }
    timerStopReasonRef.current = outcomeResult;
    closeModal();
  }, [
    closeModal,
    currentPrompt.intensity,
    currentPrompt.type,
    logOutcomeEvent,
    recordPlayerEvent,
    roundCount,
  ]);

  const openSettingsModal = useCallback(() => {
    playClick();
    setActiveModal("settings");
  }, [playClick, setActiveModal]);

  const openEditorModal = useCallback(() => {
    playClick();
    setActiveModal("editor");
  }, [playClick, setActiveModal]);

  const handleSpinButton = useCallback(() => {
    playClick();
    handleSpin();
  }, [handleSpin, playClick]);

  if (!gameId) {
    return (
      <StartScreen
        createNewGame={createNewGame}
        joinGame={joinGame}
        inputGameId={inputGameId}
        setInputGameId={setInputGameId}
        resetInputGameId={resetInputGameId}
        gameMode={mode}
        onSelectMode={setMode}
        onButtonClick={playClick}
      />
    );
  }

  if (promptsLoading) {
    return (
      <LoadingScreen
        message="Loading your shared prompts"
        onButtonClick={playClick}
      />
    );
  }

  if (promptsError) {
    return (
      <LoadingScreen
        message={promptsError}
        isError
        onRetry={retryPrompts}
        onButtonClick={playClick}
      />
    );
  }

  if (!prompts) {
    return (
      <LoadingScreen message="Preparing the wheel" onButtonClick={playClick} />
    );
  }

  const isSfxActive = soundPulse || isLoopingSound;
  const extremeSpinActive = isSpinning && isExtremeRound;
  const activeExtremeLevel = pendingExtremeSpin
    ? Math.min(Math.max(extremePulseLevel, 1), 4)
    : extremeSpinActive
    ? 4
    : 0;

  return (
    <div className="app-shell">
      <main className="app-panel">
        <div className="app-panel__body">
          <div className="app-panel__top-bar">
            <div className="app-panel__badge-group">
              <button
                type="button"
                className={`badge-button ${
                  copySuccess ? "badge-button--success" : ""
                }`}
                onClick={handleCopyGameIdClick}
                aria-live="polite"
                aria-label={
                  copySuccess
                    ? `Game ID ${gameId} copied to clipboard`
                    : `Copy game ID ${gameId} to clipboard`
                }
              >
                <span aria-hidden="true">ID: {gameId}</span>
                {copySuccess && (
                  <span className="badge-button__status" aria-hidden="true">
                    Copied
                  </span>
                )}
                <span className="sr-only">
                  {copySuccess
                    ? "Copied game ID to clipboard"
                    : "Tap to copy the game ID"}
                </span>
              </button>
              <button
                type="button"
                className="badge-button"
                onClick={handleResetGame}
                aria-label="Reset game session"
              >
                Reset
              </button>
            </div>
          {isSingleDeviceMode && (
            <div
              className="badge-button"
              role="status"
              aria-live="polite"
              style={{ justifySelf: "center", pointerEvents: "none", cursor: "default" }}
            >
              Playing Together
            </div>
          )}
          {isOfflineMode && (
            <div
              className="badge-button"
              role="status"
              aria-live="polite"
              style={{ justifySelf: "center", pointerEvents: "none", cursor: "default" }}
            >
              Offline Mode
            </div>
          )}
            <button
              type="button"
              className="icon-button"
              aria-label="Open settings"
              aria-haspopup="dialog"
              aria-expanded={activeModal === "settings"}
              onClick={openSettingsModal}
            >
              <SettingsIcon />
            </button>
          </div>

          <div className="app-hud">
            <AdrenalineBar value={playerAdrenaline} />
            <PlayerBadges badges={playerBadges} />
          </div>

          <header className="app-heading">
            <div className="app-heading__title">
              <SparklesIcon />
              Date Night
            </div>
            <div className="app-heading__subtitle" aria-live="polite">
              Round {roundCount + 1}
            </div>
          </header>

          {activeExtremeLevel > 0 && (
            <div
              className={`extreme-meter extreme-meter--level-${activeExtremeLevel}`}
              role="status"
              aria-live="assertive"
            >
              <div className="extreme-meter__pulse" aria-hidden="true" />
              <div className="extreme-meter__icon" aria-hidden="true">
                <FlameIcon />
              </div>
              <div className="extreme-meter__content">
                <span className="extreme-meter__label">Extreme Meter</span>
                <span className="extreme-meter__status">
                  {activeExtremeLevel >= 4
                    ? "Extreme spin imminent!"
                    : "Extreme round incoming"}
                </span>
              </div>
              <span className="sr-only">
                Extreme round incoming. Meter level {activeExtremeLevel}.
              </span>
            </div>
          )}

          <Wheel
            rotation={rotation}
            isExtremeRound={isExtremeRound}
            segments={WHEEL_SEGMENTS}
            showPulse={isSfxActive}
            spinDuration={spinDuration}
            isSpinning={isSpinning}
            onPointerDown={handleWheelPointerDown}
            onPointerMove={handleWheelPointerMove}
            onPointerUp={handleWheelPointerEnd}
            onPointerCancel={handleWheelPointerCancel}
            onPointerLeave={handleWheelPointerCancel}
            extremeMeter={extremeMeter}
          >
            <div className="spin-button">
              <button
                type="button"
                className={`spin-button__trigger ${
                  isSfxActive ? "spin-button__trigger--active" : ""
                }`}
                onClick={handleSpinButton}
                disabled={isSpinning}
                aria-pressed={isSpinning}
                aria-live="polite"
              >
                <span aria-hidden="true">{isSpinning ? "…" : "Spin"}</span>
                <span className="sr-only">
                  {isSpinning ? "Wheel spinning" : "Spin the wheel"}
                </span>
              </button>
            </div>
          </Wheel>
          <span className="sr-only" aria-live="polite">
            {isSfxActive ? "Sound effects playing" : "Sound effects idle"}
          </span>
          <StatsDashboardPlaceholder
            gameId={gameId}
            mode={mode}
            playerId={playerId}
            db={remoteDb}
          />
        </div>
      </main>

      <SettingsModal
        isOpen={activeModal === "settings"}
        onClose={closeModal}
        musicVolume={musicVolume}
        onMusicVolumeChange={setMusicVolume}
        sfxVolume={sfxVolume}
        onSfxVolumeChange={setSfxVolume}
        isSfxActive={isSfxActive}
        onOpenEditor={openEditorModal}
        debugAnalyticsEnabled={debugAnalyticsEnabled}
        onToggleDebugAnalytics={setDebugAnalyticsEnabled}
        analyticsEvents={analyticsEvents}
      />

      <PromptModal
        isOpen={activeModal === "prompt"}
        onClose={closeModal}
        prompt={currentPrompt}
        onRefuse={handleRefuse}
        onButtonClick={playClick}
        onAccept={handlePromptAccept}
        roundTimer={roundTimer}
        timerActive={timerActive}
      />

      <ConsequenceModal
        isOpen={activeModal === "consequence"}
        onClose={closeModal}
        consequence={currentConsequence}
        onButtonClick={playClick}
      />

      {activeModal === "editor" && (
        <EditorModal
          isOpen
          onClose={() => setActiveModal("settings")}
          prompts={prompts}
          setPrompts={savePrompts}
          generatedPrompts={generatedPrompts}
          onRegeneratePrompts={regenerateGeneratedPrompts}
          onButtonClick={playClick}
        />
      )}

      <AnnouncementModal
        isOpen={activeModal === "announcement"}
        onClose={handleAnnouncementClose}
        onButtonClick={playClick}
        onConfirm={handleAnnouncementClose}
      />
    </div>
  );
}
