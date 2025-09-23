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
import Modal from "./components/modals/Modal.jsx";
import PromptModal from "./components/modals/PromptModal.jsx";
import RewardModal from "./components/modals/RewardModal.jsx";
import Wheel from "./components/Wheel.jsx";
import LoadingScreen from "./components/screens/LoadingScreen.jsx";
import StartScreen from "./components/screens/StartScreen.jsx";
import {
  MusicIcon,
  PencilIcon,
  SettingsIcon,
  SoundIcon,
  SparklesIcon,
  FlameIcon,
} from "./components/icons/Icons.jsx";
import { useBackgroundMusic } from "./hooks/useBackgroundMusic.js";
import { usePersistentState } from "./hooks/usePersistentState.js";
import { usePrompts } from "./hooks/usePrompts.js";
import { useSound } from "./hooks/useSound.js";
import {
  buildPromptGroups,
  generatePromptSet,
} from "./utils/promptGenerator.js";
import { useAnalytics } from "./hooks/useAnalytics.js";
import { useMultiplayer } from "./hooks/useMultiplayer.jsx";

const STORAGE_KEYS = {
  gameId: "dateNightGameId",
  musicVolume: "dateNightMusicVol",
  sfxVolume: "dateNightSfxVol",
  roundCount: "dateNightRoundCount",
  lastPrompts: "dateNightLastPrompts",
  extremeMeter: "dateNightExtremeMeter",
  generatedPrompts: "dateNightGeneratedPrompts",
  multiplayerEnabled: "dateNightMultiplayerEnabled",
};

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

const rewardBurst = (badge) => {
  const palettes = {
    Bronze: ["#fb923c", "#f97316", "#fed7aa", "#fde68a"],
    Silver: ["#f8fafc", "#cbd5f5", "#94a3b8", "#e2e8f0"],
    Gold: ["#facc15", "#fbbf24", "#fde68a", "#f97316"],
    Legendary: ["#c084fc", "#a855f7", "#38bdf8", "#f472b6"],
  };
  const colors = palettes[badge] ?? palettes.Legendary;
  const end = Date.now() + 1400;

  const frame = () => {
    confetti({
      particleCount: 8,
      spread: 70,
      startVelocity: 42,
      gravity: 0.8,
      origin: { x: Math.random() * 0.4 + 0.15, y: 0.2 },
      colors,
    });
    confetti({
      particleCount: 8,
      spread: 70,
      startVelocity: 42,
      gravity: 0.8,
      origin: { x: Math.random() * 0.4 + 0.45, y: 0.2 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
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
  const [streakHighlight, setStreakHighlight] = useState(false);
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
  const [roundTimer, setRoundTimer] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const regenerateGeneratedPrompts = useCallback(() => {
    setGeneratedPrompts(generatePromptSet());
  }, [setGeneratedPrompts]);
  const rotationRef = useRef(0);
  const spinTimeoutRef = useRef(null);
  const pendingSpinRef = useRef(null);
  const pendingSpinContextRef = useRef(null);
  const copyFeedbackTimeoutRef = useRef(null);
  const soundPulseTimeoutRef = useRef(null);
  const meterForcedExtremeRef = useRef(false);
  const timerRef = useRef(null);
  const timerExpiredRef = useRef(false);
  const lastSpinDetailsRef = useRef(null);
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
  const remoteSpinGuardRef = useRef(false);
  const remotePromptGuardRef = useRef(false);
  const multiplayerHandlersRef = useRef({
    onRemoteSpin: null,
    onRemotePrompt: null,
  });
  const lockWarningTimeoutRef = useRef(null);
  const [lockWarning, setLockWarning] = useState("");

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
  const [multiplayerEnabled, setMultiplayerEnabled] = usePersistentState(
    STORAGE_KEYS.multiplayerEnabled,
    true,
    {
      serialize: (value) => (value ? "1" : "0"),
      deserialize: (value) => value !== "0",
    }
  );

  const {
    prompts,
    savePrompts,
    promptGroups: customPromptGroups,
    isLoading: promptsLoading,
    error: promptsError,
    retry: retryPrompts,
  } = usePrompts(gameId);
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

  const {
    isAvailable: multiplayerAvailable,
    isActive: multiplayerActive,
    playerId,
    connectedCount,
    playerStreak,
    publishLocalSpin,
    publishLocalPrompt,
    acquireLock: acquireSpinLockRemote,
    releaseLock: releaseSpinLockRemote,
  } = useMultiplayer({
    gameId,
    enabled: multiplayerEnabled,
    onRemoteSpin: (payload) =>
      multiplayerHandlersRef.current.onRemoteSpin?.(payload),
    onRemotePrompt: (payload) =>
      multiplayerHandlersRef.current.onRemotePrompt?.(payload),
  });
  useEffect(() => {
    if (!gameId) {
      return;
    }

    regenerateGeneratedPrompts();
  }, [gameId, regenerateGeneratedPrompts]);

  const shouldPlayMusic = Boolean(gameId) && toneReady && musicVolume > 0;
  const { stop: stopMusic } = useBackgroundMusic(
    musicVolume,
    shouldPlayMusic,
    toneReady
  );
  const { play, startLoop, stopLoop } = useSound(sfxVolume, toneReady);
  const {
    streak,
    bestStreak,
    pendingReward,
    incrementStreak,
    resetStreak,
    acknowledgeReward,
    trackSpin,
    trackOutcome,
    trackTimer,
    trackExtremeMeter,
    downloadReport,
  } = useAnalytics(gameId);

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
      if (lockWarningTimeoutRef.current) {
        window.clearTimeout(lockWarningTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!multiplayerActive) {
      setLockWarning("");
      releaseSpinLockRemote();
    }
  }, [multiplayerActive, releaseSpinLockRemote, setLockWarning]);

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
    if (streak <= 0) {
      setStreakHighlight(false);
      return;
    }

    setStreakHighlight(true);
    const timeout = window.setTimeout(() => {
      setStreakHighlight(false);
    }, 620);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [streak]);

  useEffect(() => {
    if (!pendingReward) {
      return;
    }

    triggerSound("click");
    triggerSound("fanfare");
    triggerHapticFeedback(HAPTIC_PATTERNS.medium);
    rewardBurst(pendingReward.badge);
  }, [pendingReward, triggerHapticFeedback, triggerSound]);

  useEffect(() => {
    if (activeModal === "prompt") {
      setRoundTimer(30);
      timerExpiredRef.current = false;
      setTimerActive(true);
      return;
    }

    stopRoundTimer();
    setRoundTimer(30);
  }, [activeModal, stopRoundTimer]);

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
          const lastSpin = lastSpinDetailsRef.current;
          trackTimer({
            status: "timeout",
            promptType: currentPrompt.type,
            intensity: currentPrompt.intensity,
            remaining: 0,
            round: lastSpin?.round ?? roundCount + 1,
            trigger: lastSpin?.trigger,
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
    play,
    roundCount,
    timerActive,
    trackTimer,
    triggerTimerVibration,
  ]);

  const handlePromptRefuse = useCallback(
    (reason = "manual", override = null) => {
      stopRoundTimer();
      const levels = ["normal", "spicy", "extreme"];
      const selection =
        override?.consequence?.intensity ?? pickRandom(levels);

      const keyMap = {
        normal: "consequenceNormal",
        spicy: "consequenceSpicy",
        extreme: "consequenceExtreme",
      };
      const pool = promptGroups[keyMap[selection]] ?? [];
      const consequence = override?.consequence?.text
        ? override.consequence.text
        : pool.length
        ? pickRandom(pool)
        : "No consequences available. You're safe this time!";

      const sounds = override?.sounds ?? ["refusalBoo"];
      if (!override?.sounds) {
        if (selection === "spicy") {
          sounds.push("spicyGiggle");
        }
        if (selection === "extreme") {
          sounds.push("extremeWooo");
        }
      }
      setPendingConsequenceSounds(sounds);
      const consequencePayload = { text: consequence, intensity: selection };
      setCurrentConsequence(consequencePayload);
      setActiveModal("consequence");

      const lastSpin = lastSpinDetailsRef.current;
      const round = lastSpin?.round ?? roundCount + 1;
      const promptType = currentPrompt.type;
      const promptIntensity = currentPrompt.intensity;
      const result =
        override?.result ??
        (reason === "timeout"
          ? "auto-refusal"
          : promptType === "trivia"
          ? "incorrect"
          : "refused");

      resetStreak({ promptType, reason });
      trackOutcome({
        result,
        promptType,
        intensity: promptIntensity,
        round,
        reason,
        source: lastSpin?.source,
        trigger: lastSpin?.trigger,
      });

      trackTimer({
        status: reason === "timeout" ? "auto-refusal" : "cancelled",
        promptType,
        intensity: promptIntensity,
        remaining: roundTimer,
        round,
        reason,
        trigger: lastSpin?.trigger,
      });

      if (multiplayerActive && !remotePromptGuardRef.current) {
        publishLocalPrompt({
          id: lastSpin?.promptId,
          status: reason,
          result,
          prompt: {
            title: currentPrompt.title,
            text: currentPrompt.text,
            type: promptType,
            intensity: promptIntensity,
          },
          consequence: consequencePayload,
          round,
          releaseLock: true,
          reason,
        });
      }
    },
    [
      currentPrompt.intensity,
      currentPrompt.type,
      currentPrompt.text,
      currentPrompt.title,
      multiplayerActive,
      publishLocalPrompt,
      promptGroups,
      remotePromptGuardRef,
      resetStreak,
      roundCount,
      roundTimer,
      stopRoundTimer,
      trackOutcome,
      trackTimer,
    ]
  );

  const handleManualRefuse = useCallback(() => {
    handlePromptRefuse("manual");
  }, [handlePromptRefuse]);

  useEffect(() => {
    if (!timerActive && activeModal === "prompt" && timerExpiredRef.current) {
      timerExpiredRef.current = false;
      handlePromptRefuse("timeout");
    }
  }, [activeModal, handlePromptRefuse, timerActive]);

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
    (segment, outcomeKey, flags, override = null) => {
      const promptText = override?.promptText ?? choosePrompt(outcomeKey);
      recordPromptHistory(outcomeKey, promptText);

      const promptTitle = override?.promptTitle ?? segment.title;
      const promptType = override?.promptType ?? segment.id;
      const intensity =
        override?.promptIntensity ??
        (flags.isExtreme
          ? "extreme"
          : flags.isSpicy
          ? "spicy"
          : "normal");
      const promptId =
        override?.promptId ??
        lastSpinDetailsRef.current?.promptId ??
        `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const spinId = override?.spinId ?? lastSpinDetailsRef.current?.spinId ?? null;

      setCurrentPrompt({
        title: promptTitle,
        text: promptText,
        type: promptType,
        intensity,
      });
      lastSpinDetailsRef.current = {
        ...(lastSpinDetailsRef.current ?? {}),
        promptTitle,
        promptText,
        promptType,
        intensity,
        outcomeKey,
        promptId,
        spinId,
      };
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
      const eventRound = lastSpinDetailsRef.current?.round ?? roundCount + 1;
      setRoundCount((value) => value + 1);
      if (flags.isExtreme) {
        if (meterForcedExtremeRef.current) {
          meterForcedExtremeRef.current = false;
        }
      } else {
        setExtremeMeter((previous) => {
          const next = Math.min(100, previous + 20);
          console.log("Extreme meter:", next);
          trackExtremeMeter({
            previous,
            next,
            reason: "spin",
            promptType,
            round: eventRound,
          });
          lastSpinDetailsRef.current = {
            ...(lastSpinDetailsRef.current ?? {}),
            meterValueAfter: next,
          };
          return next;
        });
      }

      if (multiplayerActive && !remoteSpinGuardRef.current) {
        publishLocalPrompt({
          id: promptId,
          status: "show",
          prompt: {
            title: promptTitle,
            text: promptText,
            type: promptType,
            intensity,
          },
          round: eventRound,
          spinId,
        });
      }
    },
    [
      choosePrompt,
      multiplayerActive,
      publishLocalPrompt,
      recordPromptHistory,
      remoteSpinGuardRef,
      roundCount,
      setExtremeMeter,
      setRoundCount,
      triggerHapticFeedback,
      trackExtremeMeter,
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
    let segment = WHEEL_SEGMENTS[landingIndex] ?? WHEEL_SEGMENTS[0];
    const pending = pendingSpinRef.current;
    const forceExtreme = pending?.forceExtreme ?? false;
    const usingPending =
      pending && pending.selectedIndex === landingIndex && pending.outcome;
    if (usingPending) {
      segment = WHEEL_SEGMENTS[pending.selectedIndex] ?? segment;
    }
    const outcomeInfo = usingPending
      ? pending.outcome
      : determineOutcome(segment, forceExtreme);
    const promptOverride = usingPending
      ? {
          promptText: pending.promptText,
          promptIntensity: pending.promptIntensity,
          promptTitle: pending.promptTitle,
          promptType: pending.promptType,
          promptId: pending.promptId,
          spinId: pending.spinId,
        }
      : null;

    pendingSpinRef.current = null;
    concludeSpin(segment, outcomeInfo.outcomeKey, outcomeInfo, promptOverride);
  }, [concludeSpin, determineOutcome, setIsSpinning]);

  const startSpin = useCallback(
    (
      forceExtreme,
      swipeStrength = MAX_SWIPE_STRENGTH / 2,
      context = {},
      override = null
    ) => {
      const sliceCount = WHEEL_SEGMENTS.length;
      if (!sliceCount) {
        return;
      }

      const isRemote = Boolean(override?.isRemote);
      const normalizedSwipeStrength = Number.isFinite(swipeStrength)
        ? swipeStrength
        : MAX_SWIPE_STRENGTH / 2;
      const clampedStrength = Math.min(
        Math.max(normalizedSwipeStrength, 0),
        MAX_SWIPE_STRENGTH
      );
      const effectiveStrength = Math.max(clampedStrength, MIN_SWIPE_STRENGTH);
      const normalizedStrength =
        override?.spinDuration !== undefined
          ? null
          : MAX_SWIPE_STRENGTH > 0
          ? effectiveStrength / MAX_SWIPE_STRENGTH
          : 0.5;

      pendingSpinContextRef.current = null;
      const availableIndexes = forceExtreme
        ? Array.from({ length: Math.min(sliceCount, 2) }, (_, index) => index)
        : WHEEL_SEGMENTS.map((_, index) => index);
      const selectedIndex =
        override?.selectedIndex !== undefined
          ? Math.max(0, Math.min(sliceCount - 1, override.selectedIndex))
          : availableIndexes[
              Math.floor(Math.random() * availableIndexes.length)
            ] ?? 0;
      const sliceAngle = 360 / sliceCount;
      const selectedSegment = WHEEL_SEGMENTS[selectedIndex] ?? WHEEL_SEGMENTS[0];
      const outcome =
        override?.outcome ?? determineOutcome(selectedSegment, forceExtreme);
      const spinRound = override?.round ?? roundCount + 1;
      const spinContext = {
        source: context.source ?? override?.context?.source ?? "button",
        trigger:
          context.trigger ??
          override?.context?.trigger ??
          (forceExtreme ? "extreme" : "standard"),
        swipeStrength: Number.isFinite(swipeStrength)
          ? swipeStrength
          : override?.context?.swipeStrength ?? null,
        meterValueBefore:
          context.meterValueBefore !== undefined
            ? context.meterValueBefore
            : override?.context?.meterValueBefore ?? extremeMeter,
        round: spinRound,
        forcedByMeter:
          Boolean(context?.trigger === "meter") ||
          Boolean(override?.context?.forcedByMeter),
      };
      const promptText = override?.promptText ?? choosePrompt(outcome.outcomeKey);
      const promptIntensity =
        override?.promptIntensity ??
        (outcome.isExtreme ? "extreme" : outcome.isSpicy ? "spicy" : "normal");
      const promptId =
        override?.promptId ??
        `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const spinId =
        override?.id ??
        `spin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      pendingSpinRef.current = {
        forceExtreme: Boolean(forceExtreme),
        selectedIndex,
        outcome,
        context: spinContext,
        promptText,
        promptIntensity,
        promptId,
        promptTitle: override?.promptTitle ?? selectedSegment.title,
        promptType: override?.promptType ?? selectedSegment.id,
        spinId,
      };
      lastSpinDetailsRef.current = {
        segmentId: selectedSegment.id,
        segmentLabel: selectedSegment.label,
        round: spinContext.round,
        source: spinContext.source,
        trigger: spinContext.trigger,
        meterValueBefore: spinContext.meterValueBefore,
        forcedByMeter: spinContext.forcedByMeter,
        promptId,
        spinId,
      };

      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }

      let spinDurationMs;
      let finalRotation;
      if (override?.finalRotation !== undefined) {
        spinDurationMs =
          override.spinDuration ?? BASE_SPIN_DURATION_MS * 1.2;
        finalRotation = override.finalRotation;
      } else {
        const randomOffset = (Math.random() - 0.5) * sliceAngle * 0.6;
        const targetAngle =
          -(selectedIndex * sliceAngle + sliceAngle / 2) + randomOffset;
        const minDuration = BASE_SPIN_DURATION_MS * 0.75;
        const maxDuration = BASE_SPIN_DURATION_MS * 1.85;
        const durationRatio = normalizedStrength ?? 0.5;
        spinDurationMs =
          minDuration + (maxDuration - minDuration) * durationRatio;
        const totalExtraRotations =
          MIN_EXTRA_ROTATIONS +
          (MAX_EXTRA_ROTATIONS - MIN_EXTRA_ROTATIONS) * durationRatio;
        const extraSpins = totalExtraRotations * 360;
        const baseRotation =
          rotationRef.current - (rotationRef.current % 360);
        finalRotation = baseRotation + extraSpins + targetAngle;
      }

      setIsSpinning(true);
      setIsExtremeRound(outcome.isExtreme);
      startSoundLoop();
      triggerHapticFeedback(HAPTIC_PATTERNS.medium);
      setSpinDuration(spinDurationMs);

      trackSpin({
        ...spinContext,
        forceExtreme: Boolean(forceExtreme),
        isExtreme: outcome.isExtreme,
        isSpicy: outcome.isSpicy,
        outcomeKey: outcome.outcomeKey,
        segmentId: selectedSegment.id,
        segmentLabel: selectedSegment.label,
        gameId,
      });

      rotationRef.current = finalRotation;
      setRotation(finalRotation);

      if (multiplayerActive && !isRemote) {
        publishLocalSpin({
          id: spinId,
          forceExtreme: Boolean(forceExtreme),
          selectedIndex,
          segmentId: selectedSegment.id,
          segmentLabel: selectedSegment.label,
          finalRotation,
          spinDuration: spinDurationMs,
          outcomeKey: outcome.outcomeKey,
          isExtreme: outcome.isExtreme,
          isSpicy: outcome.isSpicy,
          promptText,
          promptTitle: pendingSpinRef.current.promptTitle,
          promptType: pendingSpinRef.current.promptType,
          promptIntensity,
          promptId,
          round: spinContext.round,
          context: spinContext,
        });
      }

      spinTimeoutRef.current = window.setTimeout(() => {
        stopSoundLoop();
        finalizeSpin();
        spinTimeoutRef.current = null;
      }, spinDurationMs);
    },
    [
      choosePrompt,
      determineOutcome,
      finalizeSpin,
      gameId,
      extremeMeter,
      multiplayerActive,
      publishLocalSpin,
      roundCount,
      setSpinDuration,
      startSoundLoop,
      stopSoundLoop,
      trackSpin,
      triggerHapticFeedback,
    ]
  );

  const handleRemoteSpin = useCallback(
    (spinEvent) => {
      if (!spinEvent) {
        return;
      }

      const spinContext = spinEvent.context ?? {};
      remoteSpinGuardRef.current = true;
      try {
        startSpin(
          Boolean(spinEvent.forceExtreme),
          spinContext.swipeStrength ?? MAX_SWIPE_STRENGTH / 2,
          {
            source: spinContext.source ?? "remote",
            trigger:
              spinContext.trigger ??
              (spinEvent.forceExtreme ? "extreme" : "standard"),
            meterValueBefore:
              spinContext.meterValueBefore !== undefined
                ? spinContext.meterValueBefore
                : extremeMeter,
          },
          {
            ...spinEvent,
            isRemote: true,
            selectedIndex: spinEvent.selectedIndex,
            outcome: {
              outcomeKey: spinEvent.outcomeKey,
              isExtreme: Boolean(spinEvent.isExtreme),
              isSpicy: Boolean(spinEvent.isSpicy),
            },
            promptTitle: spinEvent.promptTitle,
            promptType: spinEvent.promptType,
            promptIntensity: spinEvent.promptIntensity,
            promptText: spinEvent.promptText,
            promptId: spinEvent.promptId,
            finalRotation: spinEvent.finalRotation,
            spinDuration: spinEvent.spinDuration,
            round: spinEvent.round,
            context: spinContext,
          }
        );
      } finally {
        remoteSpinGuardRef.current = false;
      }
    },
    [extremeMeter, startSpin]
  );

  const handleSpin = useCallback(
    async (context = {}) => {
      if (isSpinning) {
        return;
      }

      if (multiplayerActive && !remoteSpinGuardRef.current) {
        const allowed = await acquireSpinLockRemote();
        if (!allowed) {
          setLockWarning("Wait for your partner's spin");
          if (typeof window !== "undefined") {
            if (lockWarningTimeoutRef.current) {
              window.clearTimeout(lockWarningTimeoutRef.current);
            }
            lockWarningTimeoutRef.current = window.setTimeout(() => {
              setLockWarning("");
              lockWarningTimeoutRef.current = null;
            }, 2600);
          }
          return;
        }
        setLockWarning("");
      }

      const baseContext = {
        source: context.source ?? "button",
        meterValueBefore: extremeMeter,
      };

      if (extremeMeter >= 100) {
        meterForcedExtremeRef.current = true;
        setExtremeMeter((previous) => {
          trackExtremeMeter({
            previous,
            next: 0,
            reason: "forced-extreme",
            round: roundCount + 1,
          });
          console.log("Extreme meter:", 0);
          lastSpinDetailsRef.current = {
            ...(lastSpinDetailsRef.current ?? {}),
            meterValueAfter: 0,
          };
          return 0;
        });
        startSpin(true, undefined, { ...baseContext, trigger: "meter" });
        return;
      }

      const isExtreme = Math.random() < EXTREME_ROUND_CHANCE;

      if (isExtreme) {
        setPendingExtremeSpin(true);
        setActiveModal("announcement");
        pendingSpinContextRef.current = {
          ...baseContext,
          trigger: "random-extreme",
        };
        return;
      }

      startSpin(false, undefined, { ...baseContext, trigger: "standard" });
    },
    [
      acquireSpinLockRemote,
      extremeMeter,
      isSpinning,
      lockWarningTimeoutRef,
      multiplayerActive,
      remoteSpinGuardRef,
      roundCount,
      setLockWarning,
      setExtremeMeter,
      startSpin,
      trackExtremeMeter,
    ]
  );

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

      startSpin(false, strength, { source: "swipe", trigger: "standard" });
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
      const context =
        pendingSpinContextRef.current ?? {
          source: "button",
          trigger: "random-extreme",
        };
      pendingSpinContextRef.current = null;
      setPendingExtremeSpin(false);
      startSpin(true, undefined, context);
    }
  }, [pendingExtremeSpin, startSpin]);

  

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
    const newId = createRandomGameId();
    setGameId(newId);
    setRoundCount(0);
    setLastPrompts({});
  }, [setGameId, setLastPrompts, setRoundCount]);

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
    setIsExtremeRound(false);
    if (multiplayerActive) {
      releaseSpinLockRemote();
      setLockWarning("");
    }
    setRotation(0);
    rotationRef.current = 0;
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
    multiplayerActive,
    releaseSpinLockRemote,
    setGameId,
    setLastPrompts,
    setLockWarning,
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
    const lastSpin = lastSpinDetailsRef.current;
    const promptType = currentPrompt.type;
    const promptIntensity = currentPrompt.intensity;
    const result = promptType === "trivia" ? "correct" : "accepted";
    const round = lastSpin?.round ?? roundCount + 1;

    incrementStreak({
      promptType,
      intensity: promptIntensity,
      round,
      source: lastSpin?.source,
      trigger: lastSpin?.trigger,
    });
    trackOutcome({
      result,
      promptType,
      intensity: promptIntensity,
      round,
      source: lastSpin?.source,
      trigger: lastSpin?.trigger,
    });
    trackTimer({
      status: "completed",
      promptType,
      intensity: promptIntensity,
      remaining: roundTimer,
      round,
      trigger: lastSpin?.trigger,
    });

    if (multiplayerActive && !remotePromptGuardRef.current) {
      publishLocalPrompt({
        id: lastSpin?.promptId,
        status: result,
        result,
        prompt: {
          title: currentPrompt.title,
          text: currentPrompt.text,
          type: promptType,
          intensity: promptIntensity,
        },
        round,
        releaseLock: true,
      });
    }

    closeModal();
  }, [
    closeModal,
    currentPrompt.intensity,
    currentPrompt.type,
    currentPrompt.text,
    currentPrompt.title,
    incrementStreak,
    multiplayerActive,
    publishLocalPrompt,
    remotePromptGuardRef,
    roundCount,
    roundTimer,
    trackOutcome,
    trackTimer,
  ]);

  const openSettingsModal = useCallback(() => {
    playClick();
    setActiveModal("settings");
  }, [playClick, setActiveModal]);

  const openEditorModal = useCallback(() => {
    playClick();
    setActiveModal("editor");
  }, [playClick, setActiveModal]);

  const handleDownloadReport = useCallback(() => {
    playClick();
    downloadReport();
  }, [downloadReport, playClick]);

  const handleSpinButton = useCallback(() => {
    playClick();
    handleSpin({ source: "button" });
  }, [handleSpin, playClick]);

  const handleRemotePrompt = useCallback(
    (event) => {
      if (!event) {
        return;
      }

      if (event.status === "show") {
        return;
      }

      remotePromptGuardRef.current = true;
      try {
        const result = event.result ?? event.status ?? "";
        if (result === "accepted" || result === "correct") {
          handlePromptAccept();
          return;
        }

        if (
          result === "refused" ||
          result === "auto-refusal" ||
          result === "incorrect" ||
          result === "timeout" ||
          event.status === "timeout"
        ) {
          const mappedReason =
            event.reason ??
            (result === "auto-refusal" || result === "timeout"
              ? "timeout"
              : "manual");
          handlePromptRefuse(mappedReason, {
            consequence: event.consequence,
            result,
          });
        }
      } finally {
        remotePromptGuardRef.current = false;
      }
    },
    [handlePromptAccept, handlePromptRefuse]
  );

  useEffect(() => {
    multiplayerHandlersRef.current = {
      onRemoteSpin: handleRemoteSpin,
      onRemotePrompt: handleRemotePrompt,
    };
  }, [handleRemotePrompt, handleRemoteSpin]);

  if (!gameId) {
    return (
      <StartScreen
        createNewGame={createNewGame}
        joinGame={joinGame}
        inputGameId={inputGameId}
        setInputGameId={setInputGameId}
        resetInputGameId={resetInputGameId}
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
              <span
                className="badge-button"
                role="status"
                aria-live="polite"
                title={
                  multiplayerActive
                    ? `${connectedCount} players connected`
                    : "Multiplayer disabled"
                }
              >
                {multiplayerActive ? `Players: ${connectedCount}` : "Local Play"}
              </span>
              <span
                className="badge-button"
                role="status"
                aria-live="polite"
                title={`Your streak — Accepts: ${playerStreak.accepts}, Refusals: ${playerStreak.refusals}`}
              >
                You A{playerStreak.accepts} / R{playerStreak.refusals}
              </span>
            </div>
            <div
              className={`streak-indicator ${
                streakHighlight ? "streak-indicator--active" : ""
              }`}
              role="status"
              aria-live="polite"
            >
              <span className="streak-indicator__icon" aria-hidden="true">
                🔥
              </span>
              <div className="streak-indicator__content">
                <span className="streak-indicator__label">Streak</span>
                <span className="streak-indicator__value">{streak}</span>
              </div>
              <span className="streak-indicator__best">Best {bestStreak}</span>
            </div>
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

          {lockWarning && (
            <div
              className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-center text-xs text-amber-200"
              role="status"
              aria-live="assertive"
            >
              {lockWarning}
            </div>
          )}

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
        </div>
      </main>

      <Modal
        isOpen={activeModal === "settings"}
        onClose={closeModal}
        labelledBy="settings-modal-title"
      >
        <h2
          id="settings-modal-title"
          className="mb-6 text-2xl font-semibold text-slate-100"
        >
          Settings
        </h2>
        <div className="settings-section">
          <div className="settings-row">
            <MusicIcon />
            <input
              className="settings-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(event) =>
                setMusicVolume(parseFloat(event.target.value))
              }
            />
          </div>
          <div
            className={`settings-row ${
              isSfxActive ? "settings-row--active" : ""
            }`}
          >
            <SoundIcon />
            <input
              className="settings-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={(event) => setSfxVolume(parseFloat(event.target.value))}
            />
          </div>
          <div className="settings-row justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-100">
                Multiplayer
              </span>
              <span className="text-xs text-[color:var(--text-muted)]">
                {multiplayerAvailable
                  ? "Sync spins across connected devices"
                  : "Add Firebase config to enable remote play"}
              </span>
            </div>
            <label className="relative inline-flex items-center">
              <input
                type="checkbox"
                className="sr-only"
                checked={multiplayerEnabled && multiplayerAvailable}
                onChange={(event) =>
                  setMultiplayerEnabled(event.target.checked)
                }
                disabled={!multiplayerAvailable}
              />
              <span
                className={`ml-3 flex h-6 w-11 items-center rounded-full border border-white/20 bg-slate-800 transition-colors ${
                  multiplayerEnabled && multiplayerAvailable
                    ? "bg-[color:var(--primary-accent)] border-[color:var(--primary-accent)]"
                    : "bg-slate-800"
                }`}
                aria-hidden="true"
              >
                <span
                  className={`h-5 w-5 rounded-full bg-white transition-transform ${
                    multiplayerEnabled && multiplayerAvailable
                      ? "translate-x-4"
                      : "translate-x-1"
                  }`}
                />
              </span>
            </label>
          </div>
          <button
            type="button"
            className="primary-button flex items-center justify-center gap-2"
            onClick={openEditorModal}
          >
            <PencilIcon /> Edit Prompts
          </button>
          <button
            type="button"
            className="secondary-button mt-3 w-full"
            onClick={handleDownloadReport}
          >
            Download Session Report
          </button>
        </div>
      </Modal>

      <PromptModal
        isOpen={activeModal === "prompt"}
        onClose={closeModal}
        prompt={currentPrompt}
        onRefuse={handleManualRefuse}
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
      <RewardModal
        isOpen={Boolean(pendingReward)}
        onClose={acknowledgeReward}
        onButtonClick={playClick}
        reward={pendingReward}
      />
    </div>
  );
}
