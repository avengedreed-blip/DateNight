import React, { useCallback, useEffect, useRef, useState } from "react";
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
} from "./components/icons/Icons.jsx";
import { useBackgroundMusic } from "./hooks/useBackgroundMusic.js";
import { usePersistentState } from "./hooks/usePersistentState.js";
import { usePrompts } from "./hooks/usePrompts.js";
import { useSound } from "./hooks/useSound.js";

const STORAGE_KEYS = {
  gameId: "dateNightGameId",
  musicVolume: "dateNightMusicVol",
  sfxVolume: "dateNightSfxVol",
  roundCount: "dateNightRoundCount",
  lastPrompts: "dateNightLastPrompts",
};

const EXTREME_ROUND_CHANCE = 0.2;
const MAX_RECENT_PROMPTS = 5;
const SPIN_DURATION_MS = 4000;

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

const confettiBurst = () => {
  if (!window.confetti) {
    return;
  }

  const colors = ["#a855f7", "#38bdf8", "#f472b6", "#fde68a"];
  const end = Date.now() + 1200;

  const frame = () => {
    window.confetti({
      particleCount: 6,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    window.confetti({
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
  const [currentPrompt, setCurrentPrompt] = useState({ title: "", text: "" });
  const [currentConsequence, setCurrentConsequence] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isExtremeRound, setIsExtremeRound] = useState(false);
  const rotationRef = useRef(0);
  const spinTimeoutRef = useRef(null);

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

  const { prompts, savePrompts, promptGroups, isLoading: promptsLoading } =
    usePrompts(gameId);
  const shouldPlayMusic = Boolean(gameId) && toneReady && musicVolume > 0;
  const { stop: stopMusic } = useBackgroundMusic(
    musicVolume,
    shouldPlayMusic,
    toneReady
  );
  const { play, startLoop, stopLoop } = useSound(sfxVolume, toneReady);

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
      }
      stopLoop();
    };
  }, [stopLoop]);

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

      if (flags.isExtreme) {
        play("extremeWooo");
      } else if (flags.isSpicy) {
        play("spicyGiggle");
      }

      setCurrentPrompt({ title: segment.title, text: promptText });
      setActiveModal("prompt");
      setIsSpinning(false);
      setIsExtremeRound(flags.isExtreme);
      setRoundCount((value) => value + 1);
    },
    [choosePrompt, play, recordPromptHistory, setRoundCount]
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

  const startSpin = useCallback(
    (forceExtreme) => {
      const availableSegments = forceExtreme
        ? WHEEL_SEGMENTS.slice(0, 2)
        : WHEEL_SEGMENTS;
      const sliceAngle = 360 / availableSegments.length;
      const selectedIndex = Math.floor(Math.random() * availableSegments.length);
      const selectedSegment = availableSegments[selectedIndex];
      const outcome = determineOutcome(selectedSegment, forceExtreme);
      const randomOffset = (Math.random() - 0.5) * sliceAngle * 0.6;
      const targetAngle =
        -(selectedIndex * sliceAngle + sliceAngle / 2) + randomOffset;
      const extraSpins = 5 * 360;

      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }

      setIsSpinning(true);
      setIsExtremeRound(outcome.isExtreme);
      startLoop();

      const baseRotation = rotationRef.current - (rotationRef.current % 360);
      const finalRotation = baseRotation + extraSpins + targetAngle;
      rotationRef.current = finalRotation;
      setRotation(finalRotation);

      spinTimeoutRef.current = window.setTimeout(() => {
        stopLoop();
        concludeSpin(selectedSegment, outcome.outcomeKey, outcome);
      }, SPIN_DURATION_MS);
    },
    [concludeSpin, determineOutcome, startLoop, stopLoop]
  );

  const handleSpin = useCallback(() => {
    if (isSpinning) {
      return;
    }

    const isExtreme = Math.random() < EXTREME_ROUND_CHANCE;

    if (isExtreme) {
      setPendingExtremeSpin(true);
      setActiveModal("announcement");
      play("fanfare");
      confettiBurst();
      return;
    }

    startSpin(false);
  }, [isSpinning, play, startSpin]);

  const handleAnnouncementClose = useCallback(() => {
    setActiveModal(null);
    if (pendingExtremeSpin) {
      setPendingExtremeSpin(false);
      startSpin(true);
    }
  }, [pendingExtremeSpin, startSpin]);

  const handleRefuse = useCallback(() => {
    play("refusalBoo");
    const levels = ["normal", "spicy", "extreme"];
    const selection = pickRandom(levels);

    if (selection === "spicy") {
      play("spicyGiggle");
    }
    if (selection === "extreme") {
      play("extremeWooo");
    }

    const keyMap = {
      normal: "consequenceNormal",
      spicy: "consequenceSpicy",
      extreme: "consequenceExtreme",
    };
    const pool = promptGroups[keyMap[selection]] ?? [];
    const consequence = pool.length
      ? pickRandom(pool)
      : "No consequences available. You're safe this time!";

    setCurrentConsequence(consequence);
    setActiveModal("consequence");
  }, [play, promptGroups]);

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

  const copyGameId = useCallback(async () => {
    if (!gameId || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(gameId);
    } catch (error) {
      console.warn("Failed to copy game id", error);
    }
  }, [gameId]);

  const handleResetGame = useCallback(() => {
    stopMusic();
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }
    setIsSpinning(false);
    stopLoop();
    setIsExtremeRound(false);
    setRotation(0);
    rotationRef.current = 0;
    setGameId(null);
    setRoundCount(0);
    setLastPrompts({});
    setCurrentPrompt({ title: "", text: "" });
    setCurrentConsequence("");
    setInputGameId("");
  }, [setGameId, setLastPrompts, setRoundCount, stopLoop, stopMusic]);

  const closeModal = useCallback(() => {
    setActiveModal((previous) => {
      if (previous === "prompt") {
        setIsExtremeRound(false);
      }
      return null;
    });
  }, []);

  if (!gameId) {
    return (
      <StartScreen
        createNewGame={createNewGame}
        joinGame={joinGame}
        inputGameId={inputGameId}
        setInputGameId={setInputGameId}
      />
    );
  }

  if (promptsLoading || !prompts) {
    return <LoadingScreen message="Loading game" />;
  }

  return (
    <div className="app-shell">
      <main className="app-panel">
        <div className="app-panel__body">
          <div className="app-panel__top-bar">
            <div className="app-panel__badge-group">
              <button type="button" className="badge-button" onClick={copyGameId}>
                ID: {gameId}
              </button>
              <button type="button" className="badge-button" onClick={handleResetGame}>
                Reset
              </button>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Open settings"
              onClick={() => setActiveModal("settings")}
            >
              <SettingsIcon />
            </button>
          </div>

          <header className="app-heading">
            <div className="app-heading__title">
              <SparklesIcon />
              Date Night
            </div>
            <div className="app-heading__subtitle">Round {roundCount + 1}</div>
          </header>

          <Wheel
            rotation={rotation}
            isExtremeRound={isExtremeRound}
            segments={WHEEL_SEGMENTS}
          >
            <div className="spin-button">
              <button
                type="button"
                className="spin-button__trigger"
                onClick={handleSpin}
                disabled={isSpinning}
              >
                {isSpinning ? "…" : "Spin"}
              </button>
            </div>
          </Wheel>
        </div>
      </main>

      <Modal isOpen={activeModal === "settings"} onClose={closeModal}>
        <h2 className="mb-6 text-2xl font-semibold text-slate-100">
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
          <div className="settings-row">
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
            onClick={() => setActiveModal("editor")}
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
      />

      <ConsequenceModal
        isOpen={activeModal === "consequence"}
        onClose={closeModal}
        text={currentConsequence}
      />

      {activeModal === "editor" && (
        <EditorModal
          isOpen
          onClose={() => setActiveModal("settings")}
          prompts={prompts}
          setPrompts={savePrompts}
        />
      )}

      <AnnouncementModal
        isOpen={activeModal === "announcement"}
        onClose={handleAnnouncementClose}
      />
    </div>
  );
}
