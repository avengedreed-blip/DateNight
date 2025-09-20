import { useEffect, useRef, useCallback } from 'react';

export const useSound = (sfxVolume, scriptsLoaded) => {
  const synths = useRef(null);
  const sounds = useRef({});
  const spinnerLoop = useRef(null);

  useEffect(() => {
    if (scriptsLoaded && !synths.current && window.Tone) {
      synths.current = {
        fanfare: new window.Tone.PolySynth(window.Tone.Synth, { oscillator: { type: "sawtooth" } }).toDestination(),
        spicy: new window.Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 } }).toDestination(),
        extreme: new window.Tone.MonoSynth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.5 }, filterEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.1, release: 0.8, baseFrequency: 400, octaves: 4 } }).toDestination(),
        boo: new window.Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.1, release: 0.3 } }).toDestination(),
        click: new window.Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 3, oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.2, sustain: 0.01, release: 0.4 } }).toDestination(),
        spinner: new window.Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.005, decay: 0.05, sustain: 0 }, volume: -14 }).toDestination(),
      };

      sounds.current = {
        fanfare: () => {
          const now = window.Tone.now();
          synths.current.fanfare.triggerAttackRelease(["C4", "E4", "G4", "C5"], "8n", now);
          synths.current.fanfare.triggerAttackRelease(["G4", "A4", "B4", "C5"], "8n", now + 0.2);
        },
        spicyGiggle: () => {
          const now = window.Tone.now();
          synths.current.spicy.triggerAttackRelease("G5", "16n", now);
          synths.current.spicy.triggerAttackRelease("E5", "16n", now + 0.1);
          synths.current.spicy.triggerAttackRelease("G5", "16n", now + 0.2);
        },
        extremeWooo: () => {
          const now = window.Tone.now();
          synths.current.extreme.triggerAttack("C4", now);
          synths.current.extreme.frequency.rampTo("G4", 0.3, now);
          synths.current.extreme.triggerRelease(now + 0.3);
        },
        refusalBoo: () => {
          const now = window.Tone.now();
          synths.current.boo.triggerAttackRelease("A2", "8n", now);
          synths.current.boo.triggerAttackRelease("G#2", "4n", now + 0.125);
        },
        click: () => {
          synths.current.click.triggerAttackRelease("C2", "8n", window.Tone.now());
        },
      };

      spinnerLoop.current = new window.Tone.Loop((time) => {
        if (synths.current.spinner) {
          synths.current.spinner.triggerAttack(time);
        }
      }, "16n");
    }
  }, [scriptsLoaded]);

  useEffect(() => {
    if (synths.current) {
      synths.current.fanfare.volume.value = -18 + sfxVolume * 18;
      synths.current.spicy.volume.value = -12 + sfxVolume * 12;
      synths.current.extreme.volume.value = -10 + sfxVolume * 10;
      synths.current.boo.volume.value = -10 + sfxVolume * 10;
      synths.current.click.volume.value = -12 + sfxVolume * 12;
    }
  }, [sfxVolume]);

  const play = useCallback((soundName) => {
    if (sounds.current[soundName] && window.Tone?.Transport.state === "started") {
      window.Tone.Transport.scheduleOnce(() => {
        sounds.current[soundName]();
      }, window.Tone.now());
    }
  }, []);

  const startLoop = useCallback(() => {
    if (spinnerLoop.current && spinnerLoop.current.state !== "started") {
      spinnerLoop.current.start(0);
    }
  }, []);

  const stopLoop = useCallback(() => {
    if (spinnerLoop.current?.state === "started") {
      spinnerLoop.current.stop();
    }
  }, []);

  return { play, startLoop, stopLoop };
};
