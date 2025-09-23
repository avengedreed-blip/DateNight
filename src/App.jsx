import confetti from "canvas-confetti";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnnouncementModal from "./components/modals/AnnouncementModal.jsx";
import ConsequenceModal from "./components/modals/ConsequenceModal.jsx";
import EditorModal from "./components/modals/EditorModal.jsx";
import Modal from "./components/modals/Modal.jsx";
import PromptModal from "./components/modals/PromptModal.jsx";
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

const STORAGE_KEYS = {
  gameId: "dateNightGameId",
  musicVolume: "dateNightMusicVol",
  sfxVolume: "dateNightSfxVol",
  roundCount: "dateNightRoundCount",
  lastPrompts: "dateNightLastPrompts",
};

const EXTREME_ROUND_CHANCE = 0.2;
const MAX_RECENT_PROMPTS = 5;
const BASE_SPIN_DURATION_MS = 4000;
const MIN_SWIPE_DISTANCE = 40;
const MIN_SWIPE_STRENGTH = 0.35;
const MAX_SWIPE_STRENGTH = 2;

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

const createRandomGameId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

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
  });
  const [currentConsequence, setCurrentConsequence] = useState("");
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
  const [generatedPrompts, setGeneratedPrompts] = useState(() =>
    generatePromptSet()
  );
  const regenerateGeneratedPrompts = useCallback(() => {
    setGeneratedPrompts(generatePromptSet());
  }, []);
  const rotationRef = useRef(0);
  const spinTimeoutRef = useRef(null);
  const pendingSpinRef = useRef(null);
  const copyFeedbackTimeoutRef = useRef(null);
  const soundPulseTimeoutRef = useRef(null);
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

  const triggerHapticFeedback = useCallback((pattern = HAPTIC_PATTERNS.light) => {
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
  }, []);

  const playClick = useCallback(() => {
    triggerSound("click");
    triggerHapticFeedback(HAPTIC_PATTERNS.light);
  }, [triggerHapticFeedback, triggerSound]);

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
    };
  }, [stopSoundLoop]);

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

  const choosePrompt = useCallback(
    (outcomeKey) => {
      const pool = promptGroups[outcomeKey] ?? [];
      if (!pool.length) {
        return "No prompts available for this category.";
      }

      const recentPrompts = new Set(
        (lastPrompts?.[outcomeKey] ?? []).slice(-MAX_RECENT_PROMPTS)
      );
      const weightedPool = pool.map((prompt) => ({
        prompt,
        weight: recentPrompts.has(prompt) ? 0.2 : 1,
      }));

      const totalWeight = weightedPool.reduce(
        (total, item) => total + item.weight,
        0
      );
      let threshold = Math.random() * totalWeight;

      for (const item of weightedPool) {
        threshold -= item.weight;
        if (threshold <= 0) {
          return item.prompt;
        }
      }

      return weightedPool.at(-1)?.prompt ?? pool[0];
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

      setCurrentPrompt({
        title: segment.title,
        text: promptText,
        type: segment.id,
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
    },
    [
      choosePrompt,
      recordPromptHistory,
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
    const normalizedRotation =
      ((rotationRef.current % 360) + 360) % 360;
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
      const normalizedStrength =
        MAX_SWIPE_STRENGTH > 0
          ? clampedStrength / MAX_SWIPE_STRENGTH
          : 0.5;
      const sliceCount = WHEEL_SEGMENTS.length;
      if (!sliceCount) {
        return;
      }

      const availableIndexes = forceExtreme
        ? Array.from({ length: Math.min(sliceCount, 2) }, (_, index) => index)
        : WHEEL_SEGMENTS.map((_, index) => index);
      const selectedIndex =
        availableIndexes[Math.floor(Math.random() * availableIndexes.length)] ?? 0;
      const sliceAngle = 360 / sliceCount;
      const selectedSegment = WHEEL_SEGMENTS[selectedIndex];
      const outcome = determineOutcome(selectedSegment, forceExtreme);
      pendingSpinRef.current = {
        forceExtreme,
        selectedIndex,
        outcome,
      };
      const randomOffset = (Math.random() - 0.5) * sliceAngle * 0.6;
      const targetAngle =
        -(selectedIndex * sliceAngle + sliceAngle / 2) + randomOffset;
      const minDuration = BASE_SPIN_DURATION_MS * 0.7;
      const maxDuration = BASE_SPIN_DURATION_MS * 1.35;
      const spinDurationMs =
        minDuration + (maxDuration - minDuration) * normalizedStrength;
      const extraSpins = (3.5 + 3 * normalizedStrength) * 360;

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

    const isExtreme = Math.random() < EXTREME_ROUND_CHANCE;

    if (isExtreme) {
      setPendingExtremeSpin(true);
      setActiveModal("announcement");
      return;
    }

    startSpin(false);
  }, [isSpinning, startSpin, triggerSound]);

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

      if (totalDistance < MIN_SWIPE_DISTANCE) {
        return;
      }

      const normalizedDistance = Math.min(totalDistance / 220, MAX_SWIPE_STRENGTH);
      const normalizedVelocity = Math.min(peakVelocity / 1.2, MAX_SWIPE_STRENGTH);
      const rawStrength =
        normalizedDistance * 0.55 + normalizedVelocity * 0.85;
      const strength = Math.min(rawStrength, MAX_SWIPE_STRENGTH);

      if (strength < MIN_SWIPE_STRENGTH) {
        return;
      }

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

  const handleRefuse = useCallback(() => {
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
    setCurrentConsequence(consequence);
    setActiveModal("consequence");
  }, [promptGroups]);

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
    setRotation(0);
    rotationRef.current = 0;
    setGameId(null);
    setRoundCount(0);
    setLastPrompts({});
    setCurrentPrompt({ title: "", text: "", type: "" });
    setCurrentConsequence("");
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
        setIsExtremeRound(false);
      }
      return null;
    });
  }, []);

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
    return <LoadingScreen message="Preparing the wheel" onButtonClick={playClick} />;
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
                className={`badge-button ${copySuccess ? "badge-button--success" : ""}`}
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
            onPointerDown={handleWheelPointerDown}
            onPointerMove={handleWheelPointerMove}
            onPointerUp={handleWheelPointerEnd}
            onPointerCancel={handleWheelPointerCancel}
            onPointerLeave={handleWheelPointerCancel}
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
              onChange={(event) => setMusicVolume(parseFloat(event.target.value))}
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
          <button
            type="button"
            className="primary-button flex items-center justify-center gap-2"
            onClick={openEditorModal}
          >
            <PencilIcon /> Edit Prompts
          </button>
        </div>
      </Modal>

      <PromptModal
        isOpen={activeModal === "prompt"}
        onClose={closeModal}
        prompt={currentPrompt}
        onRefuse={handleRefuse}
        onButtonClick={playClick}
        onAccept={closeModal}
      />

      <ConsequenceModal
        isOpen={activeModal === "consequence"}
        onClose={closeModal}
        text={currentConsequence}
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
