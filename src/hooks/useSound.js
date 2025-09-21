import { useCallback, useEffect, useRef } from "react";

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

    const fanfare = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" },
    }).toDestination();

    const spicy = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 },
    }).toDestination();

    const extreme = new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.5 },
      filterEnvelope: {
        attack: 0.04,
        decay: 0.2,
        sustain: 0.1,
        release: 0.8,
        baseFrequency: 400,
        octaves: 4,
      },
    }).toDestination();

    const boo = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.03, decay: 0.3, sustain: 0.1, release: 0.3 },
    }).toDestination();

    const click = new Tone.MembraneSynth({
      pitchDecay: 0.005,
      octaves: 3,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.01, release: 0.3 },
    }).toDestination();

    const spinner = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.005, decay: 0.05, sustain: 0 },
      volume: -14,
    }).toDestination();

    const spinnerLoop = new Tone.Loop((time) => {
      spinner.triggerAttack(time);
    }, "16n");

    const synths = { fanfare, spicy, extreme, boo, click, spinner };

    resourcesRef.current = {
      synths,
      players: createPlayers(Tone, synths),
      spinnerLoop,
    };

    return () => {
      spinnerLoop.dispose();
      Object.values(synths).forEach((node) => node.dispose());
      resourcesRef.current = null;
    };
  }, [toneReady]);

  useEffect(() => {
    const resources = resourcesRef.current;

    if (!resources) {
      return;
    }

    resources.synths.fanfare.volume.value = -18 + volume * 18;
    resources.synths.spicy.volume.value = -12 + volume * 12;
    resources.synths.extreme.volume.value = -10 + volume * 10;
    resources.synths.boo.volume.value = -10 + volume * 10;
    resources.synths.click.volume.value = -12 + volume * 12;
  }, [volume]);

  const play = useCallback((soundName) => {
    const Tone = window.Tone;
    const resources = resourcesRef.current;

    if (!Tone || !resources) {
      return;
    }

    const handler = resources.players[soundName];
    if (!handler) {
      return;
    }

    if (Tone.Transport.state !== "started") {
      Tone.Transport.start();
    }

    Tone.Transport.scheduleOnce(() => {
      handler();
    }, Tone.now());
  }, []);

  const startLoop = useCallback(() => {
    const Tone = window.Tone;
    const resources = resourcesRef.current;

    if (!Tone || !resources) {
      return;
    }

    if (resources.spinnerLoop.state !== "started") {
      resources.spinnerLoop.start(0);
    }

    if (Tone.Transport.state !== "started") {
      Tone.Transport.start();
    }
  }, []);

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
