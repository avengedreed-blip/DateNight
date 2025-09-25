import React, { useState, useEffect, useCallback, lazy, Suspense, useMemo } from 'react';

// Import local components and theme data
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import Wheel from './components/Wheel';
import ExtremeMeter from './components/ExtremeMeter';
import StartScreen from './screens/Start';
import ParticleCanvas from './components/ParticleCanvas';
import themes from './theme/themes';
import './theme/tokens.css';
import useProfile, { DEFAULT_PROFILE } from './hooks/useProfile';

// Lazy-load modal components
const HelpModal = lazy(() => import('./components/modals/HelpModal').catch(() => ({ default: () => null })));
const ThemeModal = lazy(() => import('./components/modals/ThemeModal').catch(() => ({ default: () => null })));
const TruthDareModal = lazy(() => import('./components/modals/TruthDareModal').catch(() => ({ default: () => null })));
const TriviaModal = lazy(() => import('./components/modals/TriviaModal').catch(() => ({ default: () => null })));
const ConsequenceModal = lazy(() => import('./components/modals/ConsequenceModal').catch(() => ({ default: () => null })));
const ExtremeRoundModal = lazy(() => import('./components/modals/ExtremeRoundModal').catch(() => ({ default: () => null })));

const arraysEqual = (a = [], b = []) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

const particlesEqual = (a = {}, b = {}) => {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (a.type ?? '') === (b.type ?? '') && (a.color ?? '') === (b.color ?? '');
};

const themesEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    arraysEqual(a.bg ?? [], b.bg ?? []) &&
    arraysEqual(a.colors ?? [], b.colors ?? []) &&
    (a.labels ?? '') === (b.labels ?? '') &&
    (a.meterBg ?? '') === (b.meterBg ?? '') &&
    particlesEqual(a.particles ?? {}, b.particles ?? {})
  );
};

const resolveThemeFromProfile = (profile) => {
  if (profile?.themeId === 'custom' && profile?.customTheme) {
    return profile.customTheme;
  }
  if (profile?.themeId && themes[profile.themeId]) {
    return themes[profile.themeId];
  }
  return themes[DEFAULT_PROFILE.themeId];
};

const applyProfileAttributes = (profile) => {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  if (!root) {
    return;
  }
  const username = profile?.username ?? DEFAULT_PROFILE.username;
  const avatar = profile?.avatar ?? DEFAULT_PROFILE.avatar;
  root.dataset.playerName = username;
  root.dataset.playerAvatar = avatar;
};

const App = () => {
  const { profile, updateProfile } = useProfile();
  const [currentScreen, setCurrentScreen] = useState('start');
  const [isHelpModalOpen, setHelpModalOpen] = useState(false);
  const [isThemeModalOpen, setThemeModalOpen] = useState(false);
  const [isTruthDareModalOpen, setTruthDareModalOpen] = useState(false);
  const [isTriviaModalOpen, setTriviaModalOpen] = useState(false);
  const [isConsequenceModalOpen, setConsequenceModalOpen] = useState(false);
  const [isExtremeRoundModalOpen, setExtremeRoundModalOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [extremeMeterFill, setExtremeMeterFill] = useState(0);

  const [currentTheme, setCurrentTheme] = useState(() => resolveThemeFromProfile(profile));
  const labels = ['Truth', 'Dare', 'Trivia', 'Consequence'];

  useEffect(() => {
    const nextTheme = resolveThemeFromProfile(profile);
    setCurrentTheme((prev) => (themesEqual(prev, nextTheme) ? prev : nextTheme));
    applyProfileAttributes(profile);
  }, [profile]);

  // Centralized meter config
  const meterConfig = {
    name: "Thrill Gauge", // Updated thematic name
  };

  const slices = useMemo(() => {
    return labels.map((label, index) => ({
      label,
      color: `var(--${label.toLowerCase()}-color)`,
      rawColor: currentTheme.colors[index],
    }));
  }, [currentTheme]);


  // Apply CSS variables on theme change
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-gradient-start', currentTheme.bg[0]);
    root.style.setProperty('--bg-gradient-end', currentTheme.bg[1]);
    root.style.setProperty('--truth-color', currentTheme.colors[0]);
    root.style.setProperty('--dare-color', currentTheme.colors[1]);
    root.style.setProperty('--trivia-color', currentTheme.colors[2]);
    root.style.setProperty('--consequence-color', currentTheme.colors[3]);
    root.style.setProperty('--label-color', currentTheme.labels === 'white' ? 'white' : '#ccc');
    root.style.setProperty('--ring-color', currentTheme.labels === 'white' ? 'white' : '#ccc');
    root.style.setProperty('--particle-color', currentTheme.particles.color);
    root.style.setProperty('--meter-bg', currentTheme.meterBg || '#111'); // Set theme token for meter bg
  }, [currentTheme]);

  const handleStartGame = useCallback((mode) => {
    // Placeholder for Codex logic
    console.log(`Starting game in ${mode} mode.`);
    setCurrentScreen('game');
  }, []);

  const handleNavClick = useCallback((item) => {
    if (item === 'themes') setThemeModalOpen(true);
    if (item === 'help') setHelpModalOpen(true);
  }, []);

  const handleExtremeTrigger = useCallback(() => {
    // Trigger the Extreme Round modal and confetti/fanfare logic
    setExtremeRoundModalOpen(true);
    // Reset meter for the next round or phase transition logic goes here.
    setExtremeMeterFill(0);
  }, []);

  const handleThemeSelection = useCallback(
    (themeId) => {
      updateProfile({ themeId });
    },
    [updateProfile]
  );


  // Placeholder for spinning and modals
  const handleSpin = useCallback(() => {
    setIsSpinning(true);
    // Placeholder for Codex spin logic
    console.log("Spinning the wheel...");
    setTimeout(() => {
      setIsSpinning(false);
      const result = slices[Math.floor(Math.random() * slices.length)].label;
      console.log(`Wheel stopped on: ${result}`);
      if (result === 'Truth' || result === 'Dare') setTruthDareModalOpen(true);
      if (result === 'Trivia') setTriviaModalOpen(true);
      if (result === 'Consequence') setConsequenceModalOpen(true);
    }, 2000);
  }, [slices]);

  // Placeholder for Extreme Meter logic (simulating fill)
  useEffect(() => {
    const interval = setInterval(() => {
      setExtremeMeterFill(prev => {
        const newFill = Math.min(prev + 5, 100);
        if (newFill === 100) {
          clearInterval(interval);
          // The trigger logic has been moved to ExtremeMeter.jsx
        }
        return newFill;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'start':
        return <StartScreen onStartGame={handleStartGame} />;
      case 'game':
        return (
          <div className="flex flex-col items-center justify-center p-4 min-h-screen">
            <TopBar onSettingsClick={() => console.log('Settings opened')} />
            <main className="flex-grow flex flex-col items-center justify-center w-full">
              <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 text-white tracking-tight">Spin to Play</h2>
              <Wheel slices={slices} isSpinning={isSpinning} />
              <button
                onClick={handleSpin}
                data-sound="spin-start"
                data-haptic="heavy"
                className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white p-4 rounded-full font-bold text-xl shadow-lg mt-8 w-48 transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                Spin
              </button>
              <ExtremeMeter
                fillLevel={extremeMeterFill}
                meterName={meterConfig.name}
                onExtremeTrigger={handleExtremeTrigger}
              />
            </main>
            <BottomNav onNavClick={handleNavClick} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-sans relative overflow-hidden">
      <Suspense fallback={<div>Loading...</div>}>
        <ParticleCanvas theme={currentTheme} />
        {renderScreen()}
        <HelpModal isOpen={isHelpModalOpen} onClose={() => setHelpModalOpen(false)} />
        <ThemeModal isOpen={isThemeModalOpen} onClose={() => setThemeModalOpen(false)} onThemeChange={handleThemeSelection} />
        <TruthDareModal isOpen={isTruthDareModalOpen} onClose={() => setTruthDareModalOpen(false)} content="Placeholder for your truth or dare!" />
        <TriviaModal isOpen={isTriviaModalOpen} onClose={() => setTriviaModalOpen(false)} content="Placeholder for your trivia question!" />
        <ConsequenceModal isOpen={isConsequenceModalOpen} onClose={() => setConsequenceModalOpen(false)} content="Placeholder for the consequence!" />
        <ExtremeRoundModal isOpen={isExtremeRoundModalOpen} onClose={() => setExtremeRoundModalOpen(false)} content="Placeholder for the extreme round!" />
      </Suspense>
    </div>
  );
};

export default App;
