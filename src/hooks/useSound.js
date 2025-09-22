import { useCallback, useEffect, useRef } from "react";

const volumeToGain = (value, Tone) => {
  if (!Tone || value <= 0) {
    return 0;
  }

  return Math.pow(value, 1.4);
};

const createPlayers = (Tone, synths) => ({
  fanfare: () => {
    const now = Tone.now();
    synths.fanfare.triggerAttackRelease(["C4", "E4", "G4", "C5"], "8n", now);
    synths.fanfare.triggerAttackRelease(["G4", "A4", "B4", "C5"], "8n", now + 0.2);
  },
  spicyGiggle: () => {
    const now = Tone.now();
    synths.spicy.triggerAttackRelease("G5", "16n", now);
    synths.spicy.triggerAttackRelease("E5", "16n", now + 0.12);
    synths.spicy.triggerAttackRelease("G5", "16n", now + 0.24);
  },
  extremeWooo: () => {
    const now = Tone.now();
    synths.extreme.triggerAttack("C4", now);
    synths.extreme.frequency.rampTo("G4", 0.3, now);
    synths.extreme.triggerRelease(now + 0.35);
  },
  refusalBoo: () => {
    const now = Tone.now();
    synths.boo.triggerAttackRelease("A2", "8n", now);
    synths.boo.triggerAttackRelease("G#2", "4n", now + 0.15);
  },
  click: () => {
    synths.click.triggerAttackRelease("C2", "16n", Tone.now());
  },
});

export function useSound(volume, toneReady) {
  const resourcesRef = useRef(null);

  useEffect(() => {
    const Tone = window.Tone;

    if (!toneReady || !Tone || resourcesRef.current) {
      return undefined;
    }

    const masterGain = new Tone.Gain(0).toDestination();

    const fanfare = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.02, decay: 0.25, sustain: 0.4, release: 0.8 },
    }).connect(masterGain);

    const spicy = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.18, sustain: 0.2, release: 0.24 },
    }).connect(masterGain);

    const extreme = new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.6 },
      filterEnvelope: {
        attack: 0.05,
        decay: 0.18,
        sustain: 0.1,
        release: 0.9,
        baseFrequency: 380,
        octaves: 4,
      },
    }).connect(masterGain);

    const boo = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.03, decay: 0.3, sustain: 0.1, release: 0.3 },
    }).connect(masterGain);

    const click = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 3,
      oscillator: { type: "sine" },
      envelope: { attack: 0.002, decay: 0.1, sustain: 0.01, release: 0.2 },
    }).connect(masterGain);

    const spinner = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.01, decay: 0.08, sustain: 0 },
      volume: -12,
    }).connect(masterGain);

    const spinnerLoop = new Tone.Loop((time) => {
      spinner.triggerAttackRelease("16n", time);
    }, "16n");

    const warmUpTime = Tone.now() + 0.15;
    masterGain.gain.setValueAtTime(0, Tone.now());
    fanfare.triggerAttackRelease(["C4", "E4", "G4"], "32n", warmUpTime);
    spicy.triggerAttackRelease("G5", "32n", warmUpTime + 0.05);
    extreme.triggerAttackRelease("C3", "32n", warmUpTime + 0.08);
    boo.triggerAttackRelease("A2", "32n", warmUpTime + 0.12);
    click.triggerAttackRelease("C2", "64n", warmUpTime + 0.16);
    spinner.triggerAttackRelease("32n", warmUpTime + 0.2);

    const synths = { fanfare, spicy, extreme, boo, click, spinner };

    resourcesRef.current = {
      synths,
      players: createPlayers(Tone, synths),
      spinnerLoop,
      masterGain,
      warmUpCompleteAt: warmUpTime + 0.4,
    };

    return () => {
      spinnerLoop.dispose();
      masterGain.dispose();
      Object.values(synths).forEach((node) => node.dispose());
      resourcesRef.current = null;
    };
  }, [toneReady]);

  useEffect(() => {
    const Tone = window.Tone;
    const resources = resourcesRef.current;

    if (!Tone || !resources) {
      return;
    }

    const now = Tone.now();
    const target = Math.max(now, resources.warmUpCompleteAt ?? now);
    const gainValue = volumeToGain(volume, Tone);

    resources.masterGain.gain.cancelScheduledValues(now);
    resources.masterGain.gain.setValueAtTime(resources.masterGain.gain.value, now);
    resources.masterGain.gain.linearRampToValueAtTime(gainValue, target + 0.05);
  }, [volume]);

  const ensureRunning = useCallback((Tone) => {
    if (Tone.context.state !== "running") {
      Tone.start().catch(() => {});
    }
    if (Tone.Transport.state !== "started") {
      Tone.Transport.start();
    }
  }, []);

  const play = useCallback(
    (soundName) => {
      const Tone = window.Tone;
      const resources = resourcesRef.current;

      if (!Tone || !resources) {
        return;
      }

      const handler = resources.players[soundName];
      if (!handler) {
        return;
      }

      ensureRunning(Tone);
      handler();
    },
    [ensureRunning]
  );

  const startLoop = useCallback(() => {
    const Tone = window.Tone;
    const resources = resourcesRef.current;

    if (!Tone || !resources) {
      return;
    }

    ensureRunning(Tone);

    if (resources.spinnerLoop.state !== "started") {
      resources.spinnerLoop.start(0);
    }
  }, [ensureRunning]);

  const stopLoop = useCallback(() => {
    const resources = resourcesRef.current;
    if (!resources) {
      return;
    }

    if (resources.spinnerLoop.state === "started") {
      resources.spinnerLoop.stop();
    }
  }, []);

  return { play, startLoop, stopLoop };
}
