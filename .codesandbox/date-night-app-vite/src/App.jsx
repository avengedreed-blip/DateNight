import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
// The import paths have been updated to be absolute from the project root,
// which is a more robust approach for Vite projects.
import "/src/index.css";

// Hooks
import { usePrompts } from "/src/hooks/usePrompts.jsx";
import { useSound } from "/src/hooks/useSound.jsx";

// Components
import {
  SettingsIcon,
  SparklesIcon,
  MusicIcon,
  SoundIcon,
  PencilIcon,
} from "/src/components/icons/Icons.jsx";
import Modal from "/src/components/modals/Modal.jsx";
import PromptModal from "/src/components/modals/PromptModal.jsx";
import ConsequenceModal from "/src/components/modals/ConsequenceModal.jsx";
import EditorModal from "/src/components/modals/EditorModal.jsx";
import AnnouncementModal from "/src/components/modals/AnnouncementModal.jsx";
import LoadingScreen from "/src/components/screens/LoadingScreen.jsx";
import StartScreen from "/src/components/screens/StartScreen.jsx";
import Wheel from "/src/components/Wheel.jsx";

export default function App() {
  const [gameId, setGameId] = useState(
    () => localStorage.getItem("dateNightGameId") || null
  );
  const [prompts, savePrompts] = usePrompts(gameId);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  const [inputGameId, setInputGameId] = useState("");
  const [activeModal, setActiveModal] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState({ title: "", text: "" });
  const [currentConsequence, setCurrentConsequence] = useState("");
  const [musicVolume, setMusicVolume] = useState(
    () => parseFloat(localStorage.getItem("dateNightMusicVol")) || 0.1
  );
  const [sfxVolume, setSfxVolume] = useState(
    () => parseFloat(localStorage.getItem("dateNightSfxVol")) || 0.5
  );
  const [roundCount, setRoundCount] = useState(
    () => parseInt(localStorage.getItem("dateNightRoundCount")) || 0
  );

  const [lastPrompts, setLastPrompts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dateNightLastPrompts")) || {};
    } catch (e) {
      return {};
    }
  });

  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isSpinningInExtreme, setIsSpinningInExtreme] = useState(false);
  const [announcementModal, setAnnouncementModal] = useState({
    isOpen: false,
    onConfirm: () => {},
  });

  const {
    play: playSound,
    startLoop,
    stopLoop,
  } = useSound(sfxVolume, scriptsLoaded);
  const music = useRef({ synth: null, loop: null, gain: null });

  useEffect(() => {
    const initializeAudio = async () => {
      if (!window.Tone) {
        let toneScript = document.querySelector('script[src*="tone"]');
        if (!toneScript) return;
        await new Promise((resolve) => {
          if (window.Tone) resolve();
          else toneScript.onload = () => resolve();
        });
      }
      setScriptsLoaded(true);

      const startAudio = async () => {
        if (window.Tone?.context.state !== "running") await window.Tone.start();
        if (window.Tone?.Transport.state !== "started")
          window.Tone.Transport.start();
      };

      document.body.addEventListener("click", startAudio, { once: true });
      document.body.addEventListener("keydown", startAudio, { once: true });
    };
    initializeAudio();
  }, []);

  const stopMusic = useCallback(() => {
    if (music.current.loop && window.Tone?.Transport) {
      window.Tone.Transport.stop();
      Object.values(music.current).forEach((item) => item?.dispose?.());
      music.current = { synth: null, loop: null, gain: null };
    }
  }, []);

  useEffect(() => {
    if (!scriptsLoaded) return;
    const startMusic = () => {
      if (music.current.synth || !window.Tone) return;
      const gainNode = new window.Tone.Gain(musicVolume).toDestination();
      const synth = new window.Tone.Synth({
        oscillator: { type: "fmsine", modulationType: "sine" },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.8 },
      }).connect(gainNode);
      const bass = new window.Tone.MonoSynth({
        oscillator: { type: "fmsquare" },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 1 },
        filterEnvelope: {
          attack: 0.05,
          decay: 0.1,
          sustain: 0.2,
          release: 1,
          baseFrequency: 100,
          octaves: 3,
        },
      }).connect(gainNode);
      const melody = new window.Tone.Sequence(
        (time, note) => {
          if (note) synth.triggerAttackRelease(note, "16n", time);
        },
        [
          "G4",
          "A4",
          "C5",
          null,
          "A4",
          "G4",
          null,
          "E4",
          "D4",
          null,
          "E4",
          "G4",
          null,
          "C4",
          null,
          null,
        ],
        "8n"
      );
      const bassline = new window.Tone.Sequence(
        (time, note) => {
          bass.triggerAttackRelease(note, "2n", time);
        },
        ["C2", "G2", "A2", "F2"],
        "2n"
      );
      music.current = {
        synth,
        bass,
        loop: melody,
        bassLoop: bassline,
        gain: gainNode,
      };
      window.Tone.Transport.bpm.value = 110;
      melody.start(0);
      bassline.start(0);
    };
    if (musicVolume > 0 && gameId) startMusic();
    else stopMusic();
    if (music.current.gain) music.current.gain.gain.rampTo(musicVolume, 0.1);
  }, [musicVolume, stopMusic, gameId, scriptsLoaded]);

  useEffect(
    () => localStorage.setItem("dateNightMusicVol", musicVolume),
    [musicVolume]
  );
  useEffect(
    () => localStorage.setItem("dateNightSfxVol", sfxVolume),
    [sfxVolume]
  );
  useEffect(
    () => localStorage.setItem("dateNightRoundCount", roundCount),
    [roundCount]
  );
  useEffect(
    () =>
      localStorage.setItem("dateNightLastPrompts", JSON.stringify(lastPrompts)),
    [lastPrompts]
  );

  const promptPools = useMemo(() => {
    if (!prompts) return null;
    return {
      truth: [...(prompts.truthPrompts?.normal || [])],
      spicyTruth: [...(prompts.truthPrompts?.spicy || [])],
      truthExtreme: prompts.truthPrompts?.extreme || [],
      dare: [...(prompts.darePrompts?.normal || [])],
      spicyDare: [...(prompts.darePrompts?.spicy || [])],
      dareExtreme: prompts.darePrompts?.extreme || [],
      trivia: prompts.triviaQuestions?.normal || [],
    };
  }, [prompts]);

  const startActualSpin = (isExtremeRound) => {
    setIsSpinning(true);
    setIsSpinningInExtreme(isExtremeRound);
    const wheelMap = [
      {
        base: "truth",
        title: "The Truth...",
        outcomes: {
          normal: "truth",
          spicy: "spicyTruth",
          extreme: "truthExtreme",
        },
      },
      {
        base: "dare",
        title: "I Dare You!",
        outcomes: {
          normal: "dare",
          spicy: "spicyDare",
          extreme: "dareExtreme",
        },
      },
      { base: "trivia", title: "Trivia Time!", outcomes: { normal: "trivia" } },
    ];
    let landedSlice,
      outcome,
      isSpicyResult = false,
      isExtremeResult = false;
    let landedSliceIndex = Math.floor(Math.random() * wheelMap.length);

    if (isExtremeRound) {
      landedSliceIndex = Math.floor(Math.random() * 2);
      landedSlice = wheelMap[landedSliceIndex];
      outcome = landedSlice.outcomes.extreme;
      isExtremeResult = true;
    } else {
      startLoop();
      landedSlice = wheelMap[landedSliceIndex];
      if (landedSlice.base !== "trivia") {
        const outcomeTypes = ["normal", "spicy", "extreme"];
        const selectedType =
          outcomeTypes[Math.floor(Math.random() * outcomeTypes.length)];
        outcome = landedSlice.outcomes[selectedType];
        isSpicyResult = selectedType === "spicy";
        isExtremeResult = selectedType === "extreme";
      } else {
        outcome = landedSlice.outcomes.normal;
      }
    }

    const pool = promptPools[outcome] || [];
    let promptText = "No prompts available for this category.";
    if (pool.length > 0) {
      const weightedPool = pool.map((p) => ({
        p,
        w: lastPrompts[outcome]?.includes(p) ? 0.1 : 1,
      }));
      const totalWeight = weightedPool.reduce((sum, item) => sum + item.w, 0);
      let random = Math.random() * totalWeight;
      for (const item of weightedPool) {
        random -= item.w;
        if (random <= 0) {
          promptText = item.p;
          break;
        }
      }
      setLastPrompts((prev) => ({
        ...prev,
        [outcome]: [...(prev[outcome] || []), promptText].slice(-5),
      }));
    }
    const sliceAngle = 360 / wheelMap.length;
    const randomOffset = (Math.random() - 0.5) * (sliceAngle * 0.8);
    const targetAngle =
      -(landedSliceIndex * sliceAngle + sliceAngle / 2) + randomOffset;
    const extraSpins = 5 * 360;
    const finalAngle = rotation - (rotation % 360) + extraSpins + targetAngle;
    setRotation(finalAngle);

    setTimeout(() => {
      stopLoop();
      if (isExtremeResult) playSound("extremeWooo");
      else if (isSpicyResult) playSound("spicyGiggle");
      setCurrentPrompt({ title: landedSlice.title, text: promptText });
      setActiveModal("prompt");
      setIsSpinning(false);
      setIsSpinningInExtreme(false);
      setRoundCount((prev) => prev + 1);
    }, 4000);
  };

  const handleSpin = () => {
    if (isSpinning) return;
    const isExtremeRound = Math.random() < 0.2;
    if (isExtremeRound) {
      playSound("fanfare");
      if (window.confetti) {
        const end = Date.now() + 1500;
        (function frame() {
          window.confetti({
            particleCount: 7,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ["#a855f7", "#22d3ee", "#fde047", "#ffffff"],
          });
          window.confetti({
            particleCount: 7,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ["#a855f7", "#22d3ee", "#fde047", "#ffffff"],
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      }
      setAnnouncementModal({
        isOpen: true,
        onConfirm: () => {
          setAnnouncementModal({ isOpen: false, onConfirm: () => {} });
          startActualSpin(true);
        },
      });
    } else {
      startActualSpin(false);
    }
  };

  const handleRefuse = () => {
    if (!prompts) return;
    playSound("refusalBoo");
    const levels = ["normal", "spicy", "extreme"];
    const level = levels[Math.floor(Math.random() * levels.length)];
    if (level === "spicy") playSound("spicyGiggle");
    else if (level === "extreme") playSound("extremeWooo");
    const pool = prompts.consequences[level] || [];
    const text =
      pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : "No consequences found... you're safe!";
    setCurrentConsequence(text);
    setActiveModal("consequence");
  };

  const createNewGame = () => {
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem("dateNightGameId", newId);
    setGameId(newId);
  };
  const joinGame = (e) => {
    e.preventDefault();
    const trimmedId = inputGameId.trim().toUpperCase();
    if (trimmedId) {
      localStorage.setItem("dateNightGameId", trimmedId);
      setGameId(trimmedId);
    }
  };

  const copyGameId = () =>
    navigator.clipboard
      .writeText(gameId)
      .then(() => alert(`Game ID "${gameId}" copied!`));

  const handleResetGame = () => {
    stopMusic();
    localStorage.removeItem("dateNightGameId");
    localStorage.removeItem("dateNightRoundCount");
    localStorage.removeItem("dateNightLastPrompts");
    setGameId(null);
    setRoundCount(0);
    setLastPrompts({});
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  if (!gameId)
    return (
      <StartScreen
        {...{ createNewGame, joinGame, inputGameId, setInputGameId }}
      />
    );
  if (!prompts || !scriptsLoaded)
    return <LoadingScreen message="Loading Game..." />;

  return (
    <div className="min-h-screen text-[var(--text-main)] font-sans flex flex-col items-center justify-center p-4 selection:bg-violet-500/30">
      <main
        className="animated-bg w-full max-w-md mx-auto rounded-3xl shadow-2xl border border-[var(--border-color)] p-6 md:p-8 text-center relative overflow-hidden"
        style={{ animation: "subtle-pulse 4s infinite" }}
      >
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            onClick={copyGameId}
            className="bg-black/20 hover:bg-black/40 text-xs font-mono py-1.5 px-3 rounded-full transition-colors backdrop-blur-sm border border-white/10"
          >
            ID: {gameId}
          </button>
          <button
            onClick={handleResetGame}
            className="bg-black/20 hover:bg-black/40 text-xs font-mono py-1.5 px-3 rounded-full transition-colors backdrop-blur-sm border border-white/10"
          >
            Reset
          </button>
        </div>
        <button
          onClick={() => setActiveModal("settings")}
          className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white z-20 p-2 rounded-full hover:bg-black/20 transition-all"
        >
          <SettingsIcon />
        </button>

        <header className="mb-4 relative z-10">
          <div className="flex items-center justify-center gap-3 text-shadow">
            <SparklesIcon />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Date Night
            </h1>
          </div>
          <p className="text-[var(--text-secondary)] mt-1 tracking-wider">
            Round {roundCount + 1}
          </p>
        </header>

        <div className="relative z-10 p-2 rounded-full">
          <Wheel rotation={rotation} isExtremeRound={isSpinningInExtreme} />
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className="w-24 h-24 bg-white/95 rounded-full text-black font-bold text-2xl uppercase shadow-2xl transition-all duration-200 transform active:scale-90 active:brightness-90 disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100 hover:scale-105 hover:bg-white hover:shadow-[0_0_20px_white] focus:outline-none focus:ring-4 focus:ring-white/50"
            >
              {isSpinning ? "..." : "Spin"}
            </button>
          </div>
        </div>
      </main>

      <Modal isOpen={activeModal === "settings"} onClose={closeModal}>
        <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
        <div className="space-y-4 text-left">
          <div className="flex items-center gap-3 text-[var(--text-secondary)]">
            <MusicIcon />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-[var(--primary-accent)]"
            />
          </div>
          <div className="flex items-center gap-3 text-[var(--text-secondary)]">
            <SoundIcon />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-[var(--primary-accent)]"
            />
          </div>
          <button
            onClick={() => {
              setActiveModal("editor");
              playSound("click");
            }}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-[var(--primary-accent)]/80 hover:bg-[var(--primary-accent)] text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-[var(--primary-accent)]/50"
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
          isOpen={true}
          onClose={() => setActiveModal("settings")}
          prompts={prompts}
          setPrompts={savePrompts}
        />
      )}
      <AnnouncementModal
        isOpen={announcementModal.isOpen}
        onClose={announcementModal.onConfirm}
      />
    </div>
  );
}
