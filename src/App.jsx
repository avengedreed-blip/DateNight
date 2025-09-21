diff --git a/.codesandbox/date-night-app-vite/src/App.jsx b/.codesandbox/date-night-app-vite/src/App.jsx
index a6649c9c94d049399ef11d9673065867f8774cf1..ba250f99817b1d8381e492361c0b325de14662ae 100644
--- a/.codesandbox/date-night-app-vite/src/App.jsx
+++ b/.codesandbox/date-night-app-vite/src/App.jsx
@@ -1,976 +1,609 @@
-diff --git a/.codesandbox/date-night-app-vite/src/App.jsx b/.codesandbox/date-night-app-vite/src/App.jsx
-index 50b724df557e0f026510edfb26c1616027eb591d..2b80dcfce6dbd2b90515c2b3586a0c0f32b82e42 100644
---- a/.codesandbox/date-night-app-vite/src/App.jsx
-+++ b/.codesandbox/date-night-app-vite/src/App.jsx
-@@ -1,511 +1,572 @@
--import React, {
--  useState,
--  useEffect,
--  useRef,
--  useMemo,
--  useCallback,
--} from "react";
--// The import paths have been updated to be absolute from the project root,
--// which is a more robust approach for Vite projects.
--import "/src/index.css";
--
--// Hooks
--import { usePrompts } from "/src/hooks/usePrompts.jsx";
--import { useSound } from "/src/hooks/useSound.jsx";
--
--// Components
-+import React, { useCallback, useEffect, useRef, useState } from "react";
-+import AnnouncementModal from "./components/modals/AnnouncementModal.jsx";
-+import ConsequenceModal from "./components/modals/ConsequenceModal.jsx";
-+import EditorModal from "./components/modals/EditorModal.jsx";
-+import Modal from "./components/modals/Modal.jsx";
-+import PromptModal from "./components/modals/PromptModal.jsx";
-+import Wheel from "./components/Wheel.jsx";
-+import LoadingScreen from "./components/screens/LoadingScreen.jsx";
-+import StartScreen from "./components/screens/StartScreen.jsx";
- import {
--  SettingsIcon,
--  SparklesIcon,
-   MusicIcon,
--  SoundIcon,
-   PencilIcon,
--} from "/src/components/icons/Icons.jsx";
--import Modal from "/src/components/modals/Modal.jsx";
--import PromptModal from "/src/components/modals/PromptModal.jsx";
--import ConsequenceModal from "/src/components/modals/ConsequenceModal.jsx";
--import EditorModal from "/src/components/modals/EditorModal.jsx";
--import AnnouncementModal from "/src/components/modals/AnnouncementModal.jsx";
--import LoadingScreen from "/src/components/screens/LoadingScreen.jsx";
--import StartScreen from "/src/components/screens/StartScreen.jsx";
--import Wheel from "/src/components/Wheel.jsx";
-+  SettingsIcon,
-+  SoundIcon,
-+  SparklesIcon,
-+} from "./components/icons/Icons.jsx";
-+import { useBackgroundMusic } from "./hooks/useBackgroundMusic.js";
-+import { usePersistentState } from "./hooks/usePersistentState.js";
-+import { usePrompts } from "./hooks/usePrompts.js";
-+import { useSound } from "./hooks/useSound.js";
- 
--export default function App() {
--  const [gameId, setGameId] = useState(
--    () => localStorage.getItem("dateNightGameId") || null
--  );
--  const [prompts, savePrompts] = usePrompts(gameId);
--  const [scriptsLoaded, setScriptsLoaded] = useState(false);
-+const STORAGE_KEYS = {
-+  gameId: "dateNightGameId",
-+  musicVolume: "dateNightMusicVol",
-+  sfxVolume: "dateNightSfxVol",
-+  roundCount: "dateNightRoundCount",
-+  lastPrompts: "dateNightLastPrompts",
-+};
-+
-+const EXTREME_ROUND_CHANCE = 0.2;
-+const MAX_RECENT_PROMPTS = 5;
-+const SPIN_DURATION_MS = 4000;
-+const WHEEL_SEGMENTS = [
-+  {
-+    id: "truth",
-+    label: "Truth",
-+    color: "var(--wheel-truth)",
-+    title: "The Truth…",
-+    outcomes: {
-+      normal: "truth",
-+      spicy: "spicyTruth",
-+      extreme: "truthExtreme",
-+    },
-+  },
-+  {
-+    id: "dare",
-+    label: "Dare",
-+    color: "var(--wheel-dare)",
-+    title: "I Dare You!",
-+    outcomes: {
-+      normal: "dare",
-+      spicy: "spicyDare",
-+      extreme: "dareExtreme",
-+    },
-+  },
-+  {
-+    id: "trivia",
-+    label: "Trivia",
-+    color: "var(--wheel-trivia)",
-+    title: "Trivia Time!",
-+    outcomes: {
-+      normal: "trivia",
-+    },
-+  },
-+];
-+
-+const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];
-+
-+const confettiBurst = () => {
-+  if (!window.confetti) {
-+    return;
-+  }
-+
-+  const colors = ["#a855f7", "#38bdf8", "#f472b6", "#fde68a"];
-+  const end = Date.now() + 1200;
-+
-+  const frame = () => {
-+    window.confetti({
-+      particleCount: 6,
-+      angle: 60,
-+      spread: 55,
-+      origin: { x: 0 },
-+      colors,
-+    });
-+    window.confetti({
-+      particleCount: 6,
-+      angle: 120,
-+      spread: 55,
-+      origin: { x: 1 },
-+      colors,
-+    });
-+
-+    if (Date.now() < end) {
-+      requestAnimationFrame(frame);
-+    }
-+  };
-+
-+  frame();
-+};
-+
-+const createRandomGameId = () => Math.random().toString(36).slice(2, 8).toUpperCase();
- 
-+const parseNumber = (value, fallback) => {
-+  const parsed = Number.parseFloat(value);
-+  return Number.isFinite(parsed) ? parsed : fallback;
-+};
-+
-+const parseInteger = (value, fallback) => {
-+  const parsed = Number.parseInt(value, 10);
-+  return Number.isFinite(parsed) ? parsed : fallback;
-+};
-+
-+export default function App() {
-+  const [toneReady, setToneReady] = useState(false);
-   const [inputGameId, setInputGameId] = useState("");
-   const [activeModal, setActiveModal] = useState(null);
-+  const [pendingExtremeSpin, setPendingExtremeSpin] = useState(false);
-   const [currentPrompt, setCurrentPrompt] = useState({ title: "", text: "" });
-   const [currentConsequence, setCurrentConsequence] = useState("");
--  const [musicVolume, setMusicVolume] = useState(
--    () => parseFloat(localStorage.getItem("dateNightMusicVol")) || 0.1
--  );
--  const [sfxVolume, setSfxVolume] = useState(
--    () => parseFloat(localStorage.getItem("dateNightSfxVol")) || 0.5
--  );
--  const [roundCount, setRoundCount] = useState(
--    () => parseInt(localStorage.getItem("dateNightRoundCount")) || 0
--  );
-+  const [isSpinning, setIsSpinning] = useState(false);
-+  const [rotation, setRotation] = useState(0);
-+  const [isExtremeRound, setIsExtremeRound] = useState(false);
-+  const rotationRef = useRef(0);
-+  const spinTimeoutRef = useRef(null);
- 
--  const [lastPrompts, setLastPrompts] = useState(() => {
--    try {
--      return JSON.parse(localStorage.getItem("dateNightLastPrompts")) || {};
--    } catch (e) {
--      return {};
-+  const [gameId, setGameId] = usePersistentState(STORAGE_KEYS.gameId, null, {
-+    serialize: (value) => value ?? "",
-+    deserialize: (value) => (value ? value : null),
-+  });
-+  const [musicVolume, setMusicVolume] = usePersistentState(
-+    STORAGE_KEYS.musicVolume,
-+    0.2,
-+    {
-+      serialize: (value) => value.toString(),
-+      deserialize: (value) => parseNumber(value, 0.2),
-     }
-+  );
-+  const [sfxVolume, setSfxVolume] = usePersistentState(STORAGE_KEYS.sfxVolume, 0.5, {
-+    serialize: (value) => value.toString(),
-+    deserialize: (value) => parseNumber(value, 0.5),
-   });
--
--  const [isSpinning, setIsSpinning] = useState(false);
--  const [rotation, setRotation] = useState(0);
--  const [isSpinningInExtreme, setIsSpinningInExtreme] = useState(false);
--  const [announcementModal, setAnnouncementModal] = useState({
--    isOpen: false,
--    onConfirm: () => {},
-+  const [roundCount, setRoundCount] = usePersistentState(STORAGE_KEYS.roundCount, 0, {
-+    serialize: (value) => value.toString(),
-+    deserialize: (value) => parseInteger(value, 0),
-   });
-+  const [lastPrompts, setLastPrompts] = usePersistentState(
-+    STORAGE_KEYS.lastPrompts,
-+    {},
-+    {
-+      serialize: JSON.stringify,
-+      deserialize: (value) => {
-+        try {
-+          const parsed = JSON.parse(value);
-+          return parsed && typeof parsed === "object" ? parsed : {};
-+        } catch (error) {
-+          console.warn("Failed to parse stored prompt history", error);
-+          return {};
-+        }
-+      },
-+    }
-+  );
- 
--  const {
--    play: playSound,
--    startLoop,
--    stopLoop,
--  } = useSound(sfxVolume, scriptsLoaded);
--  const music = useRef({ synth: null, loop: null, gain: null });
-+  const { prompts, savePrompts, promptGroups, isLoading: promptsLoading } = usePrompts(gameId);
-+  const shouldPlayMusic = Boolean(gameId) && toneReady && musicVolume > 0;
-+  const { stop: stopMusic } = useBackgroundMusic(musicVolume, shouldPlayMusic, toneReady);
-+  const { play, startLoop, stopLoop } = useSound(sfxVolume, toneReady);
- 
-   useEffect(() => {
--    const initializeAudio = async () => {
--      if (!window.Tone) {
--        let toneScript = document.querySelector('script[src*="tone"]');
--        if (!toneScript) return;
--        await new Promise((resolve) => {
--          if (window.Tone) resolve();
--          else toneScript.onload = () => resolve();
--        });
-+    let cancelled = false;
-+    const toneScript = document.querySelector('script[src*="tone"]');
-+
-+    if (!toneScript || window.Tone) {
-+      setToneReady(true);
-+      return undefined;
-+    }
-+
-+    const handleReady = () => {
-+      if (!cancelled) {
-+        setToneReady(true);
-       }
--      setScriptsLoaded(true);
-+    };
- 
--      const startAudio = async () => {
--        if (window.Tone?.context.state !== "running") await window.Tone.start();
--        if (window.Tone?.Transport.state !== "started")
--          window.Tone.Transport.start();
--      };
-+    toneScript.addEventListener("load", handleReady, { once: true });
-+    toneScript.addEventListener("error", handleReady, { once: true });
- 
--      document.body.addEventListener("click", startAudio, { once: true });
--      document.body.addEventListener("keydown", startAudio, { once: true });
-+    return () => {
-+      cancelled = true;
-+      toneScript.removeEventListener("load", handleReady);
-+      toneScript.removeEventListener("error", handleReady);
-     };
--    initializeAudio();
-   }, []);
- 
--  const stopMusic = useCallback(() => {
--    if (music.current.loop && window.Tone?.Transport) {
--      window.Tone.Transport.stop();
--      Object.values(music.current).forEach((item) => item?.dispose?.());
--      music.current = { synth: null, loop: null, gain: null };
-+  useEffect(() => {
-+    if (!toneReady || !window.Tone) {
-+      return undefined;
-     }
--  }, []);
- 
--  useEffect(() => {
--    if (!scriptsLoaded) return;
--    const startMusic = () => {
--      if (music.current.synth || !window.Tone) return;
--      const gainNode = new window.Tone.Gain(musicVolume).toDestination();
--      const synth = new window.Tone.Synth({
--        oscillator: { type: "fmsine", modulationType: "sine" },
--        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.8 },
--      }).connect(gainNode);
--      const bass = new window.Tone.MonoSynth({
--        oscillator: { type: "fmsquare" },
--        envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 1 },
--        filterEnvelope: {
--          attack: 0.05,
--          decay: 0.1,
--          sustain: 0.2,
--          release: 1,
--          baseFrequency: 100,
--          octaves: 3,
--        },
--      }).connect(gainNode);
--      const melody = new window.Tone.Sequence(
--        (time, note) => {
--          if (note) synth.triggerAttackRelease(note, "16n", time);
--        },
--        [
--          "G4",
--          "A4",
--          "C5",
--          null,
--          "A4",
--          "G4",
--          null,
--          "E4",
--          "D4",
--          null,
--          "E4",
--          "G4",
--          null,
--          "C4",
--          null,
--          null,
--        ],
--        "8n"
--      );
--      const bassline = new window.Tone.Sequence(
--        (time, note) => {
--          bass.triggerAttackRelease(note, "2n", time);
--        },
--        ["C2", "G2", "A2", "F2"],
--        "2n"
--      );
--      music.current = {
--        synth,
--        bass,
--        loop: melody,
--        bassLoop: bassline,
--        gain: gainNode,
--      };
--      window.Tone.Transport.bpm.value = 110;
--      melody.start(0);
--      bassline.start(0);
-+    const resumeContext = async () => {
-+      try {
-+        if (window.Tone.context.state === "suspended") {
-+          await window.Tone.context.resume();
-+        }
-+        if (window.Tone.Transport.state !== "started") {
-+          window.Tone.Transport.start();
-+        }
-+      } catch (error) {
-+        console.warn("Unable to start Tone.js audio context", error);
-+      }
-     };
--    if (musicVolume > 0 && gameId) startMusic();
--    else stopMusic();
--    if (music.current.gain) music.current.gain.gain.rampTo(musicVolume, 0.1);
--  }, [musicVolume, stopMusic, gameId, scriptsLoaded]);
--
--  useEffect(
--    () => localStorage.setItem("dateNightMusicVol", musicVolume),
--    [musicVolume]
--  );
--  useEffect(
--    () => localStorage.setItem("dateNightSfxVol", sfxVolume),
--    [sfxVolume]
--  );
--  useEffect(
--    () => localStorage.setItem("dateNightRoundCount", roundCount),
--    [roundCount]
--  );
--  useEffect(
--    () =>
--      localStorage.setItem("dateNightLastPrompts", JSON.stringify(lastPrompts)),
--    [lastPrompts]
--  );
- 
--  const promptPools = useMemo(() => {
--    if (!prompts) return null;
--    return {
--      truth: [...(prompts.truthPrompts?.normal || [])],
--      spicyTruth: [...(prompts.truthPrompts?.spicy || [])],
--      truthExtreme: prompts.truthPrompts?.extreme || [],
--      dare: [...(prompts.darePrompts?.normal || [])],
--      spicyDare: [...(prompts.darePrompts?.spicy || [])],
--      dareExtreme: prompts.darePrompts?.extreme || [],
--      trivia: prompts.triviaQuestions?.normal || [],
-+    const handleInteraction = () => {
-+      resumeContext();
-     };
--  }, [prompts]);
--
--  const startActualSpin = (isExtremeRound) => {
--    setIsSpinning(true);
--    setIsSpinningInExtreme(isExtremeRound);
--    const wheelMap = [
--      {
--        base: "truth",
--        title: "The Truth...",
--        outcomes: {
--          normal: "truth",
--          spicy: "spicyTruth",
--          extreme: "truthExtreme",
--        },
--      },
--      {
--        base: "dare",
--        title: "I Dare You!",
--        outcomes: {
--          normal: "dare",
--          spicy: "spicyDare",
--          extreme: "dareExtreme",
--        },
--      },
--      { base: "trivia", title: "Trivia Time!", outcomes: { normal: "trivia" } },
--    ];
--    let landedSlice,
--      outcome,
--      isSpicyResult = false,
--      isExtremeResult = false;
--    let landedSliceIndex = Math.floor(Math.random() * wheelMap.length);
--
--    if (isExtremeRound) {
--      landedSliceIndex = Math.floor(Math.random() * 2);
--      landedSlice = wheelMap[landedSliceIndex];
--      outcome = landedSlice.outcomes.extreme;
--      isExtremeResult = true;
--    } else {
--      startLoop();
--      landedSlice = wheelMap[landedSliceIndex];
--      if (landedSlice.base !== "trivia") {
--        const outcomeTypes = ["normal", "spicy", "extreme"];
--        const selectedType =
--          outcomeTypes[Math.floor(Math.random() * outcomeTypes.length)];
--        outcome = landedSlice.outcomes[selectedType];
--        isSpicyResult = selectedType === "spicy";
--        isExtremeResult = selectedType === "extreme";
--      } else {
--        outcome = landedSlice.outcomes.normal;
-+
-+    document.addEventListener("pointerdown", handleInteraction, { once: true });
-+    document.addEventListener("keydown", handleInteraction, { once: true });
-+
-+    return () => {
-+      document.removeEventListener("pointerdown", handleInteraction);
-+      document.removeEventListener("keydown", handleInteraction);
-+    };
-+  }, [toneReady]);
-+
-+  useEffect(() => {
-+    return () => {
-+      if (spinTimeoutRef.current) {
-+        clearTimeout(spinTimeoutRef.current);
-+      }
-+      stopLoop();
-+    };
-+  }, [stopLoop]);
-+
-+  const choosePrompt = useCallback(
-+    (outcomeKey) => {
-+      const pool = promptGroups[outcomeKey] ?? [];
-+      if (!pool.length) {
-+        return "No prompts available for this category.";
-       }
--    }
- 
--    const pool = promptPools[outcome] || [];
--    let promptText = "No prompts available for this category.";
--    if (pool.length > 0) {
--      const weightedPool = pool.map((p) => ({
--        p,
--        w: lastPrompts[outcome]?.includes(p) ? 0.1 : 1,
-+      const recentPrompts = new Set((lastPrompts?.[outcomeKey] ?? []).slice(-MAX_RECENT_PROMPTS));
-+      const weightedPool = pool.map((prompt) => ({
-+        prompt,
-+        weight: recentPrompts.has(prompt) ? 0.2 : 1,
-       }));
--      const totalWeight = weightedPool.reduce((sum, item) => sum + item.w, 0);
--      let random = Math.random() * totalWeight;
-+
-+      const totalWeight = weightedPool.reduce((total, item) => total + item.weight, 0);
-+      let threshold = Math.random() * totalWeight;
-+
-       for (const item of weightedPool) {
--        random -= item.w;
--        if (random <= 0) {
--          promptText = item.p;
--          break;
-+        threshold -= item.weight;
-+        if (threshold <= 0) {
-+          return item.prompt;
-         }
-       }
--      setLastPrompts((prev) => ({
--        ...prev,
--        [outcome]: [...(prev[outcome] || []), promptText].slice(-5),
--      }));
--    }
--    const sliceAngle = 360 / wheelMap.length;
--    const randomOffset = (Math.random() - 0.5) * (sliceAngle * 0.8);
--    const targetAngle =
--      -(landedSliceIndex * sliceAngle + sliceAngle / 2) + randomOffset;
--    const extraSpins = 5 * 360;
--    const finalAngle = rotation - (rotation % 360) + extraSpins + targetAngle;
--    setRotation(finalAngle);
--
--    setTimeout(() => {
--      stopLoop();
--      if (isExtremeResult) playSound("extremeWooo");
--      else if (isSpicyResult) playSound("spicyGiggle");
--      setCurrentPrompt({ title: landedSlice.title, text: promptText });
-+
-+      return weightedPool.at(-1)?.prompt ?? pool[0];
-+    },
-+    [lastPrompts, promptGroups]
-+  );
-+
-+  const recordPromptHistory = useCallback((outcomeKey, promptText) => {
-+    setLastPrompts((previous) => {
-+      const history = { ...(previous ?? {}) };
-+      const updated = [...(history[outcomeKey] ?? []), promptText].slice(-MAX_RECENT_PROMPTS);
-+      return { ...history, [outcomeKey]: updated };
-+    });
-+  }, [setLastPrompts]);
-+
-+  const concludeSpin = useCallback(
-+    (segment, outcomeKey, flags) => {
-+      const promptText = choosePrompt(outcomeKey);
-+      recordPromptHistory(outcomeKey, promptText);
-+
-+      if (flags.isExtreme) {
-+        play("extremeWooo");
-+      } else if (flags.isSpicy) {
-+        play("spicyGiggle");
-+      }
-+
-+      setCurrentPrompt({ title: segment.title, text: promptText });
-       setActiveModal("prompt");
-       setIsSpinning(false);
--      setIsSpinningInExtreme(false);
--      setRoundCount((prev) => prev + 1);
--    }, 4000);
--  };
-+      setIsExtremeRound(flags.isExtreme);
-+      setRoundCount((value) => value + 1);
-+    },
-+    [choosePrompt, play, recordPromptHistory, setRoundCount]
-+  );
- 
--  const handleSpin = () => {
--    if (isSpinning) return;
--    const isExtremeRound = Math.random() < 0.2;
--    if (isExtremeRound) {
--      playSound("fanfare");
--      if (window.confetti) {
--        const end = Date.now() + 1500;
--        (function frame() {
--          window.confetti({
--            particleCount: 7,
--            angle: 60,
--            spread: 55,
--            origin: { x: 0 },
--            colors: ["#a855f7", "#22d3ee", "#fde047", "#ffffff"],
--          });
--          window.confetti({
--            particleCount: 7,
--            angle: 120,
--            spread: 55,
--            origin: { x: 1 },
--            colors: ["#a855f7", "#22d3ee", "#fde047", "#ffffff"],
--          });
--          if (Date.now() < end) requestAnimationFrame(frame);
--        })();
-+  const determineOutcome = useCallback((segment, forceExtreme) => {
-+    const possibleOutcomes = forceExtreme
-+      ? ["extreme"]
-+      : Object.keys(segment.outcomes);
-+
-+    const selection = pickRandom(possibleOutcomes);
-+    const outcomeKey = segment.outcomes[selection] ?? segment.outcomes.normal;
-+
-+    return {
-+      outcomeKey,
-+      isSpicy: selection === "spicy",
-+      isExtreme: selection === "extreme" || forceExtreme,
-+    };
-+  }, []);
-+
-+  const startSpin = useCallback(
-+    (forceExtreme) => {
-+      const availableSegments = forceExtreme ? WHEEL_SEGMENTS.slice(0, 2) : WHEEL_SEGMENTS;
-+      const sliceAngle = 360 / availableSegments.length;
-+      const selectedIndex = Math.floor(Math.random() * availableSegments.length);
-+      const selectedSegment = availableSegments[selectedIndex];
-+      const outcome = determineOutcome(selectedSegment, forceExtreme);
-+      const randomOffset = (Math.random() - 0.5) * sliceAngle * 0.6;
-+      const targetAngle = -(selectedIndex * sliceAngle + sliceAngle / 2) + randomOffset;
-+      const extraSpins = 5 * 360;
-+
-+      if (spinTimeoutRef.current) {
-+        clearTimeout(spinTimeoutRef.current);
-       }
--      setAnnouncementModal({
--        isOpen: true,
--        onConfirm: () => {
--          setAnnouncementModal({ isOpen: false, onConfirm: () => {} });
--          startActualSpin(true);
--        },
--      });
--    } else {
--      startActualSpin(false);
-+
-+      setIsSpinning(true);
-+      setIsExtremeRound(outcome.isExtreme);
-+      startLoop();
-+
-+      const baseRotation = rotationRef.current - (rotationRef.current % 360);
-+      const finalRotation = baseRotation + extraSpins + targetAngle;
-+      rotationRef.current = finalRotation;
-+      setRotation(finalRotation);
-+
-+      spinTimeoutRef.current = window.setTimeout(() => {
-+        stopLoop();
-+        concludeSpin(selectedSegment, outcome.outcomeKey, outcome);
-+      }, SPIN_DURATION_MS);
-+    },
-+    [concludeSpin, determineOutcome, startLoop, stopLoop]
-+  );
-+
-+  const handleSpin = useCallback(() => {
-+    if (isSpinning) {
-+      return;
-     }
--  };
- 
--  const handleRefuse = () => {
--    if (!prompts) return;
--    playSound("refusalBoo");
-+    const isExtreme = Math.random() < EXTREME_ROUND_CHANCE;
-+
-+    if (isExtreme) {
-+      setPendingExtremeSpin(true);
-+      setActiveModal("announcement");
-+      play("fanfare");
-+      confettiBurst();
-+      return;
-+    }
-+
-+    startSpin(false);
-+  }, [isSpinning, play, startSpin]);
-+
-+  const handleAnnouncementClose = useCallback(() => {
-+    setActiveModal(null);
-+    if (pendingExtremeSpin) {
-+      setPendingExtremeSpin(false);
-+      startSpin(true);
-+    }
-+  }, [pendingExtremeSpin, startSpin]);
-+
-+  const handleRefuse = useCallback(() => {
-+    play("refusalBoo");
-     const levels = ["normal", "spicy", "extreme"];
--    const level = levels[Math.floor(Math.random() * levels.length)];
--    if (level === "spicy") playSound("spicyGiggle");
--    else if (level === "extreme") playSound("extremeWooo");
--    const pool = prompts.consequences[level] || [];
--    const text =
--      pool.length > 0
--        ? pool[Math.floor(Math.random() * pool.length)]
--        : "No consequences found... you're safe!";
--    setCurrentConsequence(text);
-+    const selection = pickRandom(levels);
-+
-+    if (selection === "spicy") {
-+      play("spicyGiggle");
-+    }
-+    if (selection === "extreme") {
-+      play("extremeWooo");
-+    }
-+
-+    const keyMap = {
-+      normal: "consequenceNormal",
-+      spicy: "consequenceSpicy",
-+      extreme: "consequenceExtreme",
-+    };
-+    const pool = promptGroups[keyMap[selection]] ?? [];
-+    const consequence = pool.length
-+      ? pickRandom(pool)
-+      : "No consequences available. You're safe this time!";
-+
-+    setCurrentConsequence(consequence);
-     setActiveModal("consequence");
--  };
-+  }, [play, promptGroups]);
- 
--  const createNewGame = () => {
--    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
--    localStorage.setItem("dateNightGameId", newId);
-+  const createNewGame = useCallback(() => {
-+    const newId = createRandomGameId();
-     setGameId(newId);
--  };
--  const joinGame = (e) => {
--    e.preventDefault();
--    const trimmedId = inputGameId.trim().toUpperCase();
--    if (trimmedId) {
--      localStorage.setItem("dateNightGameId", trimmedId);
--      setGameId(trimmedId);
-+    setRoundCount(0);
-+    setLastPrompts({});
-+  }, [setGameId, setLastPrompts, setRoundCount]);
-+
-+  const joinGame = useCallback(
-+    (event) => {
-+      event.preventDefault();
-+      const trimmed = inputGameId.trim().toUpperCase();
-+      if (!trimmed) {
-+        return;
-+      }
-+      setGameId(trimmed);
-+      setRoundCount(0);
-+      setLastPrompts({});
-+    },
-+    [inputGameId, setGameId, setLastPrompts, setRoundCount]
-+  );
-+
-+  const copyGameId = useCallback(async () => {
-+    if (!gameId || !navigator.clipboard) {
-+      return;
-     }
--  };
- 
--  const copyGameId = () =>
--    navigator.clipboard
--      .writeText(gameId)
--      .then(() => alert(`Game ID "${gameId}" copied!`));
-+    try {
-+      await navigator.clipboard.writeText(gameId);
-+    } catch (error) {
-+      console.warn("Failed to copy game id", error);
-+    }
-+  }, [gameId]);
- 
--  const handleResetGame = () => {
-+  const handleResetGame = useCallback(() => {
-     stopMusic();
--    localStorage.removeItem("dateNightGameId");
--    localStorage.removeItem("dateNightRoundCount");
--    localStorage.removeItem("dateNightLastPrompts");
-+    if (spinTimeoutRef.current) {
-+      clearTimeout(spinTimeoutRef.current);
-+    }
-+    setIsSpinning(false);
-+    stopLoop();
-+    setIsExtremeRound(false);
-+    setRotation(0);
-+    rotationRef.current = 0;
-     setGameId(null);
-     setRoundCount(0);
-     setLastPrompts({});
--  };
-+    setCurrentPrompt({ title: "", text: "" });
-+    setCurrentConsequence("");
-+    setInputGameId("");
-+  }, [setGameId, setLastPrompts, setRoundCount, stopLoop, stopMusic]);
- 
--  const closeModal = () => {
--    setActiveModal(null);
--  };
-+  const closeModal = useCallback(() => {
-+    setActiveModal((previous) => {
-+      if (previous === "prompt") {
-+        setIsExtremeRound(false);
-+      }
-+      return null;
-+    });
-+  }, []);
- 
--  if (!gameId)
-+  if (!gameId) {
-     return (
-       <StartScreen
--        {...{ createNewGame, joinGame, inputGameId, setInputGameId }}
-+        createNewGame={createNewGame}
-+        joinGame={joinGame}
-+        inputGameId={inputGameId}
-+        setInputGameId={setInputGameId}
-       />
-     );
--  if (!prompts || !scriptsLoaded)
--    return <LoadingScreen message="Loading Game..." />;
-+  }
-+
-+  if (promptsLoading || !prompts) {
-+    return <LoadingScreen message="Loading game" />;
-+  }
- 
-   return (
--    <div className="min-h-screen text-[var(--text-main)] font-sans flex flex-col items-center justify-center p-4 selection:bg-violet-500/30">
--      <main
--        className="animated-bg w-full max-w-md mx-auto rounded-3xl shadow-2xl border border-[var(--border-color)] p-6 md:p-8 text-center relative overflow-hidden"
--        style={{ animation: "subtle-pulse 4s infinite" }}
--      >
--        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
--          <button
--            onClick={copyGameId}
--            className="bg-black/20 hover:bg-black/40 text-xs font-mono py-1.5 px-3 rounded-full transition-colors backdrop-blur-sm border border-white/10"
--          >
--            ID: {gameId}
--          </button>
--          <button
--            onClick={handleResetGame}
--            className="bg-black/20 hover:bg-black/40 text-xs font-mono py-1.5 px-3 rounded-full transition-colors backdrop-blur-sm border border-white/10"
--          >
--            Reset
--          </button>
--        </div>
--        <button
--          onClick={() => setActiveModal("settings")}
--          className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white z-20 p-2 rounded-full hover:bg-black/20 transition-all"
--        >
--          <SettingsIcon />
--        </button>
--
--        <header className="mb-4 relative z-10">
--          <div className="flex items-center justify-center gap-3 text-shadow">
--            <SparklesIcon />
--            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
--              Date Night
--            </h1>
--          </div>
--          <p className="text-[var(--text-secondary)] mt-1 tracking-wider">
--            Round {roundCount + 1}
--          </p>
--        </header>
--
--        <div className="relative z-10 p-2 rounded-full">
--          <Wheel rotation={rotation} isExtremeRound={isSpinningInExtreme} />
--          <div className="absolute inset-0 flex items-center justify-center">
-+    <div className="app-shell">
-+      <main className="app-panel">
-+        <div className="app-panel__body">
-+          <div className="app-panel__top-bar">
-+            <div className="app-panel__badge-group">
-+              <button type="button" className="badge-button" onClick={copyGameId}>
-+                ID: {gameId}
-+              </button>
-+              <button type="button" className="badge-button" onClick={handleResetGame}>
-+                Reset
-+              </button>
-+            </div>
-             <button
--              onClick={handleSpin}
--              disabled={isSpinning}
--              className="w-24 h-24 bg-white/95 rounded-full text-black font-bold text-2xl uppercase shadow-2xl transition-all duration-200 transform active:scale-90 active:brightness-90 disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100 hover:scale-105 hover:bg-white hover:shadow-[0_0_20px_white] focus:outline-none focus:ring-4 focus:ring-white/50"
-+              type="button"
-+              className="icon-button"
-+              aria-label="Open settings"
-+              onClick={() => setActiveModal("settings")}
-             >
--              {isSpinning ? "..." : "Spin"}
-+              <SettingsIcon />
-             </button>
-           </div>
-+
-+          <header className="app-heading">
-+            <div className="app-heading__title">
-+              <SparklesIcon />
-+              Date Night
-+            </div>
-+            <div className="app-heading__subtitle">Round {roundCount + 1}</div>
-+          </header>
-+
-+          <Wheel rotation={rotation} isExtremeRound={isExtremeRound} segments={WHEEL_SEGMENTS}>
-+            <div className="spin-button">
-+              <button
-+                type="button"
-+                className="spin-button__trigger"
-+                onClick={handleSpin}
-+                disabled={isSpinning}
-+              >
-+                {isSpinning ? "…" : "Spin"}
-+              </button>
-+            </div>
-+          </Wheel>
-         </div>
-       </main>
- 
-       <Modal isOpen={activeModal === "settings"} onClose={closeModal}>
--        <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
--        <div className="space-y-4 text-left">
--          <div className="flex items-center gap-3 text-[var(--text-secondary)]">
-+        <h2 style={{ marginTop: 0, marginBottom: "1.5rem", fontSize: "1.75rem" }}>Settings</h2>
-+        <div className="settings-section">
-+          <div className="settings-row">
-             <MusicIcon />
-             <input
-+              className="settings-slider"
-               type="range"
-               min="0"
-               max="1"
-               step="0.05"
-               value={musicVolume}
--              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
--              className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-[var(--primary-accent)]"
-+              onChange={(event) => setMusicVolume(parseFloat(event.target.value))}
-             />
-           </div>
--          <div className="flex items-center gap-3 text-[var(--text-secondary)]">
-+          <div className="settings-row">
-             <SoundIcon />
-             <input
-+              className="settings-slider"
-               type="range"
-               min="0"
-               max="1"
-               step="0.05"
-               value={sfxVolume}
--              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
--              className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-[var(--primary-accent)]"
-+              onChange={(event) => setSfxVolume(parseFloat(event.target.value))}
-             />
-           </div>
-           <button
--            onClick={() => {
--              setActiveModal("editor");
--              playSound("click");
--            }}
--            className="w-full mt-4 flex items-center justify-center gap-2 bg-[var(--primary-accent)]/80 hover:bg-[var(--primary-accent)] text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-[var(--primary-accent)]/50"
-+            type="button"
-+            className="primary-button"
-+            style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}
-+            onClick={() => setActiveModal("editor")}
-           >
-             <PencilIcon /> Edit Prompts
-           </button>
-         </div>
-       </Modal>
- 
-       <PromptModal
-         isOpen={activeModal === "prompt"}
-         onClose={closeModal}
-         prompt={currentPrompt}
-         onRefuse={handleRefuse}
-       />
-+
-       <ConsequenceModal
-         isOpen={activeModal === "consequence"}
-         onClose={closeModal}
-         text={currentConsequence}
-       />
-+
-       {activeModal === "editor" && (
-         <EditorModal
--          isOpen={true}
-+          isOpen
-           onClose={() => setActiveModal("settings")}
-           prompts={prompts}
-           setPrompts={savePrompts}
-         />
-       )}
--      <AnnouncementModal
--        isOpen={announcementModal.isOpen}
--        onClose={announcementModal.onConfirm}
--      />
-+
-+      <AnnouncementModal isOpen={activeModal === "announcement"} onClose={handleAnnouncementClose} />
-     </div>
-   );
- }
+import React, { useCallback, useEffect, useRef, useState } from "react";
+import AnnouncementModal from "./components/modals/AnnouncementModal.jsx";
+import ConsequenceModal from "./components/modals/ConsequenceModal.jsx";
+import EditorModal from "./components/modals/EditorModal.jsx";
+import Modal from "./components/modals/Modal.jsx";
+import PromptModal from "./components/modals/PromptModal.jsx";
+import Wheel from "./components/Wheel.jsx";
+import LoadingScreen from "./components/screens/LoadingScreen.jsx";
+import StartScreen from "./components/screens/StartScreen.jsx";
+import {
+  MusicIcon,
+  PencilIcon,
+  SettingsIcon,
+  SoundIcon,
+  SparklesIcon,
+} from "./components/icons/Icons.jsx";
+import { useBackgroundMusic } from "./hooks/useBackgroundMusic.js";
+import { usePersistentState } from "./hooks/usePersistentState.js";
+import { usePrompts } from "./hooks/usePrompts.js";
+import { useSound } from "./hooks/useSound.js";
+
+const STORAGE_KEYS = {
+  gameId: "dateNightGameId",
+  musicVolume: "dateNightMusicVol",
+  sfxVolume: "dateNightSfxVol",
+  roundCount: "dateNightRoundCount",
+  lastPrompts: "dateNightLastPrompts",
+};
+
+const EXTREME_ROUND_CHANCE = 0.2;
+const MAX_RECENT_PROMPTS = 5;
+const SPIN_DURATION_MS = 4000;
+
+const WHEEL_SEGMENTS = [
+  {
+    id: "truth",
+    label: "Truth",
+    color: "var(--wheel-truth)",
+    title: "The Truth…",
+    outcomes: {
+      normal: "truth",
+      spicy: "spicyTruth",
+      extreme: "truthExtreme",
+    },
+  },
+  {
+    id: "dare",
+    label: "Dare",
+    color: "var(--wheel-dare)",
+    title: "I Dare You!",
+    outcomes: {
+      normal: "dare",
+      spicy: "spicyDare",
+      extreme: "dareExtreme",
+    },
+  },
+  {
+    id: "trivia",
+    label: "Trivia",
+    color: "var(--wheel-trivia)",
+    title: "Trivia Time!",
+    outcomes: {
+      normal: "trivia",
+    },
+  },
+];
+
+const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];
+
+const confettiBurst = () => {
+  if (!window.confetti) {
+    return;
+  }
+
+  const colors = ["#a855f7", "#38bdf8", "#f472b6", "#fde68a"];
+  const end = Date.now() + 1200;
+
+  const frame = () => {
+    window.confetti({
+      particleCount: 6,
+      angle: 60,
+      spread: 55,
+      origin: { x: 0 },
+      colors,
+    });
+    window.confetti({
+      particleCount: 6,
+      angle: 120,
+      spread: 55,
+      origin: { x: 1 },
+      colors,
+    });
+
+    if (Date.now() < end) {
+      requestAnimationFrame(frame);
+    }
+  };
+
+  frame();
+};
+
+const createRandomGameId = () => Math.random().toString(36).slice(2, 8).toUpperCase();
+
+const parseNumber = (value, fallback) => {
+  const parsed = Number.parseFloat(value);
+  return Number.isFinite(parsed) ? parsed : fallback;
+};
+
+const parseInteger = (value, fallback) => {
+  const parsed = Number.parseInt(value, 10);
+  return Number.isFinite(parsed) ? parsed : fallback;
+};
+
+export default function App() {
+  const [toneReady, setToneReady] = useState(false);
+  const [inputGameId, setInputGameId] = useState("");
+  const [activeModal, setActiveModal] = useState(null);
+  const [pendingExtremeSpin, setPendingExtremeSpin] = useState(false);
+  const [currentPrompt, setCurrentPrompt] = useState({ title: "", text: "" });
+  const [currentConsequence, setCurrentConsequence] = useState("");
+  const [isSpinning, setIsSpinning] = useState(false);
+  const [rotation, setRotation] = useState(0);
+  const [isExtremeRound, setIsExtremeRound] = useState(false);
+  const rotationRef = useRef(0);
+  const spinTimeoutRef = useRef(null);
+
+  const [gameId, setGameId] = usePersistentState(STORAGE_KEYS.gameId, null, {
+    serialize: (value) => value ?? "",
+    deserialize: (value) => (value ? value : null),
+  });
+  const [musicVolume, setMusicVolume] = usePersistentState(
+    STORAGE_KEYS.musicVolume,
+    0.2,
+    {
+      serialize: (value) => value.toString(),
+      deserialize: (value) => parseNumber(value, 0.2),
+    }
+  );
+  const [sfxVolume, setSfxVolume] = usePersistentState(
+    STORAGE_KEYS.sfxVolume,
+    0.5,
+    {
+      serialize: (value) => value.toString(),
+      deserialize: (value) => parseNumber(value, 0.5),
+    }
+  );
+  const [roundCount, setRoundCount] = usePersistentState(
+    STORAGE_KEYS.roundCount,
+    0,
+    {
+      serialize: (value) => value.toString(),
+      deserialize: (value) => parseInteger(value, 0),
+    }
+  );
+  const [lastPrompts, setLastPrompts] = usePersistentState(
+    STORAGE_KEYS.lastPrompts,
+    {},
+    {
+      serialize: JSON.stringify,
+      deserialize: (value) => {
+        try {
+          const parsed = JSON.parse(value);
+          return parsed && typeof parsed === "object" ? parsed : {};
+        } catch (error) {
+          console.warn("Failed to parse stored prompt history", error);
+          return {};
+        }
+      },
+    }
+  );
+
+  const { prompts, savePrompts, promptGroups, isLoading: promptsLoading } =
+    usePrompts(gameId);
+  const shouldPlayMusic = Boolean(gameId) && toneReady && musicVolume > 0;
+  const { stop: stopMusic } = useBackgroundMusic(
+    musicVolume,
+    shouldPlayMusic,
+    toneReady
+  );
+  const { play, startLoop, stopLoop } = useSound(sfxVolume, toneReady);
+
+  useEffect(() => {
+    let cancelled = false;
+    const toneScript = document.querySelector('script[src*="tone"]');
+
+    if (!toneScript || window.Tone) {
+      setToneReady(true);
+      return undefined;
+    }
+
+    const handleReady = () => {
+      if (!cancelled) {
+        setToneReady(true);
+      }
+    };
+
+    toneScript.addEventListener("load", handleReady, { once: true });
+    toneScript.addEventListener("error", handleReady, { once: true });
+
+    return () => {
+      cancelled = true;
+      toneScript.removeEventListener("load", handleReady);
+      toneScript.removeEventListener("error", handleReady);
+    };
+  }, []);
+
+  useEffect(() => {
+    if (!toneReady || !window.Tone) {
+      return undefined;
+    }
+
+    const resumeContext = async () => {
+      try {
+        if (window.Tone.context.state === "suspended") {
+          await window.Tone.context.resume();
+        }
+        if (window.Tone.Transport.state !== "started") {
+          window.Tone.Transport.start();
+        }
+      } catch (error) {
+        console.warn("Unable to start Tone.js audio context", error);
+      }
+    };
+
+    const handleInteraction = () => {
+      resumeContext();
+    };
+
+    document.addEventListener("pointerdown", handleInteraction, { once: true });
+    document.addEventListener("keydown", handleInteraction, { once: true });
+
+    return () => {
+      document.removeEventListener("pointerdown", handleInteraction);
+      document.removeEventListener("keydown", handleInteraction);
+    };
+  }, [toneReady]);
+
+  useEffect(() => {
+    return () => {
+      if (spinTimeoutRef.current) {
+        clearTimeout(spinTimeoutRef.current);
+      }
+      stopLoop();
+    };
+  }, [stopLoop]);
+
+  const choosePrompt = useCallback(
+    (outcomeKey) => {
+      const pool = promptGroups[outcomeKey] ?? [];
+      if (!pool.length) {
+        return "No prompts available for this category.";
+      }
+
+      const recentPrompts = new Set(
+        (lastPrompts?.[outcomeKey] ?? []).slice(-MAX_RECENT_PROMPTS)
+      );
+      const weightedPool = pool.map((prompt) => ({
+        prompt,
+        weight: recentPrompts.has(prompt) ? 0.2 : 1,
+      }));
+
+      const totalWeight = weightedPool.reduce(
+        (total, item) => total + item.weight,
+        0
+      );
+      let threshold = Math.random() * totalWeight;
+
+      for (const item of weightedPool) {
+        threshold -= item.weight;
+        if (threshold <= 0) {
+          return item.prompt;
+        }
+      }
+
+      return weightedPool.at(-1)?.prompt ?? pool[0];
+    },
+    [lastPrompts, promptGroups]
+  );
+
+  const recordPromptHistory = useCallback(
+    (outcomeKey, promptText) => {
+      setLastPrompts((previous) => {
+        const history = { ...(previous ?? {}) };
+        const updated = [...(history[outcomeKey] ?? []), promptText].slice(
+          -MAX_RECENT_PROMPTS
+        );
+        return { ...history, [outcomeKey]: updated };
+      });
+    },
+    [setLastPrompts]
+  );
+
+  const concludeSpin = useCallback(
+    (segment, outcomeKey, flags) => {
+      const promptText = choosePrompt(outcomeKey);
+      recordPromptHistory(outcomeKey, promptText);
+
+      if (flags.isExtreme) {
+        play("extremeWooo");
+      } else if (flags.isSpicy) {
+        play("spicyGiggle");
+      }
+
+      setCurrentPrompt({ title: segment.title, text: promptText });
+      setActiveModal("prompt");
+      setIsSpinning(false);
+      setIsExtremeRound(flags.isExtreme);
+      setRoundCount((value) => value + 1);
+    },
+    [choosePrompt, play, recordPromptHistory, setRoundCount]
+  );
+
+  const determineOutcome = useCallback((segment, forceExtreme) => {
+    const possibleOutcomes = forceExtreme
+      ? ["extreme"]
+      : Object.keys(segment.outcomes);
+
+    const selection = pickRandom(possibleOutcomes);
+    const outcomeKey =
+      segment.outcomes[selection] ?? segment.outcomes.normal ?? "";
+
+    return {
+      outcomeKey,
+      isSpicy: selection === "spicy",
+      isExtreme: selection === "extreme" || forceExtreme,
+    };
+  }, []);
+
+  const startSpin = useCallback(
+    (forceExtreme) => {
+      const availableSegments = forceExtreme
+        ? WHEEL_SEGMENTS.slice(0, 2)
+        : WHEEL_SEGMENTS;
+      const sliceAngle = 360 / availableSegments.length;
+      const selectedIndex = Math.floor(Math.random() * availableSegments.length);
+      const selectedSegment = availableSegments[selectedIndex];
+      const outcome = determineOutcome(selectedSegment, forceExtreme);
+      const randomOffset = (Math.random() - 0.5) * sliceAngle * 0.6;
+      const targetAngle =
+        -(selectedIndex * sliceAngle + sliceAngle / 2) + randomOffset;
+      const extraSpins = 5 * 360;
+
+      if (spinTimeoutRef.current) {
+        clearTimeout(spinTimeoutRef.current);
+      }
+
+      setIsSpinning(true);
+      setIsExtremeRound(outcome.isExtreme);
+      startLoop();
+
+      const baseRotation = rotationRef.current - (rotationRef.current % 360);
+      const finalRotation = baseRotation + extraSpins + targetAngle;
+      rotationRef.current = finalRotation;
+      setRotation(finalRotation);
+
+      spinTimeoutRef.current = window.setTimeout(() => {
+        stopLoop();
+        concludeSpin(selectedSegment, outcome.outcomeKey, outcome);
+      }, SPIN_DURATION_MS);
+    },
+    [concludeSpin, determineOutcome, startLoop, stopLoop]
+  );
+
+  const handleSpin = useCallback(() => {
+    if (isSpinning) {
+      return;
+    }
+
+    const isExtreme = Math.random() < EXTREME_ROUND_CHANCE;
+
+    if (isExtreme) {
+      setPendingExtremeSpin(true);
+      setActiveModal("announcement");
+      play("fanfare");
+      confettiBurst();
+      return;
+    }
+
+    startSpin(false);
+  }, [isSpinning, play, startSpin]);
+
+  const handleAnnouncementClose = useCallback(() => {
+    setActiveModal(null);
+    if (pendingExtremeSpin) {
+      setPendingExtremeSpin(false);
+      startSpin(true);
+    }
+  }, [pendingExtremeSpin, startSpin]);
+
+  const handleRefuse = useCallback(() => {
+    play("refusalBoo");
+    const levels = ["normal", "spicy", "extreme"];
+    const selection = pickRandom(levels);
+
+    if (selection === "spicy") {
+      play("spicyGiggle");
+    }
+    if (selection === "extreme") {
+      play("extremeWooo");
+    }
+
+    const keyMap = {
+      normal: "consequenceNormal",
+      spicy: "consequenceSpicy",
+      extreme: "consequenceExtreme",
+    };
+    const pool = promptGroups[keyMap[selection]] ?? [];
+    const consequence = pool.length
+      ? pickRandom(pool)
+      : "No consequences available. You're safe this time!";
+
+    setCurrentConsequence(consequence);
+    setActiveModal("consequence");
+  }, [play, promptGroups]);
+
+  const createNewGame = useCallback(() => {
+    const newId = createRandomGameId();
+    setGameId(newId);
+    setRoundCount(0);
+    setLastPrompts({});
+  }, [setGameId, setLastPrompts, setRoundCount]);
+
+  const joinGame = useCallback(
+    (event) => {
+      event.preventDefault();
+      const trimmed = inputGameId.trim().toUpperCase();
+      if (!trimmed) {
+        return;
+      }
+      setGameId(trimmed);
+      setRoundCount(0);
+      setLastPrompts({});
+    },
+    [inputGameId, setGameId, setLastPrompts, setRoundCount]
+  );
+
+  const copyGameId = useCallback(async () => {
+    if (!gameId || !navigator.clipboard) {
+      return;
+    }
+
+    try {
+      await navigator.clipboard.writeText(gameId);
+    } catch (error) {
+      console.warn("Failed to copy game id", error);
+    }
+  }, [gameId]);
+
+  const handleResetGame = useCallback(() => {
+    stopMusic();
+    if (spinTimeoutRef.current) {
+      clearTimeout(spinTimeoutRef.current);
+    }
+    setIsSpinning(false);
+    stopLoop();
+    setIsExtremeRound(false);
+    setRotation(0);
+    rotationRef.current = 0;
+    setGameId(null);
+    setRoundCount(0);
+    setLastPrompts({});
+    setCurrentPrompt({ title: "", text: "" });
+    setCurrentConsequence("");
+    setInputGameId("");
+  }, [setGameId, setLastPrompts, setRoundCount, stopLoop, stopMusic]);
+
+  const closeModal = useCallback(() => {
+    setActiveModal((previous) => {
+      if (previous === "prompt") {
+        setIsExtremeRound(false);
+      }
+      return null;
+    });
+  }, []);
+
+  if (!gameId) {
+    return (
+      <StartScreen
+        createNewGame={createNewGame}
+        joinGame={joinGame}
+        inputGameId={inputGameId}
+        setInputGameId={setInputGameId}
+      />
+    );
+  }
+
+  if (promptsLoading || !prompts) {
+    return <LoadingScreen message="Loading game" />;
+  }
+
+  return (
+    <div className="app-shell">
+      <main className="app-panel">
+        <div className="app-panel__body">
+          <div className="app-panel__top-bar">
+            <div className="app-panel__badge-group">
+              <button type="button" className="badge-button" onClick={copyGameId}>
+                ID: {gameId}
+              </button>
+              <button type="button" className="badge-button" onClick={handleResetGame}>
+                Reset
+              </button>
+            </div>
+            <button
+              type="button"
+              className="icon-button"
+              aria-label="Open settings"
+              onClick={() => setActiveModal("settings")}
+            >
+              <SettingsIcon />
+            </button>
+          </div>
+
+          <header className="app-heading">
+            <div className="app-heading__title">
+              <SparklesIcon />
+              Date Night
+            </div>
+            <div className="app-heading__subtitle">Round {roundCount + 1}</div>
+          </header>
+
+          <Wheel
+            rotation={rotation}
+            isExtremeRound={isExtremeRound}
+            segments={WHEEL_SEGMENTS}
+          >
+            <div className="spin-button">
+              <button
+                type="button"
+                className="spin-button__trigger"
+                onClick={handleSpin}
+                disabled={isSpinning}
+              >
+                {isSpinning ? "…" : "Spin"}
+              </button>
+            </div>
+          </Wheel>
+        </div>
+      </main>
+
+      <Modal isOpen={activeModal === "settings"} onClose={closeModal}>
+        <h2 style={{ marginTop: 0, marginBottom: "1.5rem", fontSize: "1.75rem" }}>
+          Settings
+        </h2>
+        <div className="settings-section">
+          <div className="settings-row">
+            <MusicIcon />
+            <input
+              className="settings-slider"
+              type="range"
+              min="0"
+              max="1"
+              step="0.05"
+              value={musicVolume}
+              onChange={(event) => setMusicVolume(parseFloat(event.target.value))}
+            />
+          </div>
+          <div className="settings-row">
+            <SoundIcon />
+            <input
+              className="settings-slider"
+              type="range"
+              min="0"
+              max="1"
+              step="0.05"
+              value={sfxVolume}
+              onChange={(event) => setSfxVolume(parseFloat(event.target.value))}
+            />
+          </div>
+          <button
+            type="button"
+            className="primary-button"
+            style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}
+            onClick={() => setActiveModal("editor")}
+          >
+            <PencilIcon /> Edit Prompts
+          </button>
+        </div>
+      </Modal>
+
+      <PromptModal
+        isOpen={activeModal === "prompt"}
+        onClose={closeModal}
+        prompt={currentPrompt}
+        onRefuse={handleRefuse}
+      />
+
+      <ConsequenceModal
+        isOpen={activeModal === "consequence"}
+        onClose={closeModal}
+        text={currentConsequence}
+      />
+
+      {activeModal === "editor" && (
+        <EditorModal
+          isOpen
+          onClose={() => setActiveModal("settings")}
+          prompts={prompts}
+          setPrompts={savePrompts}
+        />
+      )}
+
+      <AnnouncementModal
+        isOpen={activeModal === "announcement"}
+        onClose={handleAnnouncementClose}
+      />
+    </div>
+  );
+}
