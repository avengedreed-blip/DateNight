import { useCallback, useEffect, useRef } from "react";

export function useBackgroundMusic(volume, shouldPlay, toneReady, trackId) {
  const nodesRef = useRef(null);
  const crossfadeTimeoutRef = useRef(null);
  const currentTrackRef = useRef(null);

  const stop = useCallback(() => {
    if (crossfadeTimeoutRef.current) {
      window.clearTimeout(crossfadeTimeoutRef.current);
      crossfadeTimeoutRef.current = null;
    }

    const resources = nodesRef.current;
    const Tone = window.Tone;

    if (!resources) {
      currentTrackRef.current = null;
      return;
    }

    (resources.sequences ?? []).forEach((sequence) => {
      sequence.stop();
      sequence.dispose();
    });

    (resources.instruments ?? []).forEach((instrument) => {
      instrument.dispose();
    });

    if (resources.gain) {
      if (Tone && typeof resources.gain.dispose === "function") {
        resources.gain.dispose();
      } else if (typeof resources.gain.disconnect === "function") {
        resources.gain.disconnect();
      }
    }

    nodesRef.current = null;
    currentTrackRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    const Tone = window.Tone;

    if (!toneReady || !Tone) {
      return undefined;
    }

    if (!shouldPlay) {
      stop();
      return undefined;
    }

    Tone.start().catch(() => {});

    if (!nodesRef.current) {
      const gain = new Tone.Gain(0).toDestination();

      const lead = new Tone.Synth({
        oscillator: { type: "fmsine", modulationType: "triangle" },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.4, release: 0.9 },
      }).connect(gain);

      const bass = new Tone.MonoSynth({
        oscillator: { type: "square" },
        envelope: { attack: 0.04, decay: 0.2, sustain: 0.5, release: 1.2 },
        filterEnvelope: {
          attack: 0.03,
          decay: 0.2,
          sustain: 0.2,
          release: 0.9,
          baseFrequency: 80,
          octaves: 3,
        },
      }).connect(gain);

      const melody = new Tone.Sequence(
        (time, note) => {
          if (note) {
            lead.triggerAttackRelease(note, "16n", time);
          }
        },
        ["G4", "A4", "C5", null, "A4", "G4", null, "E4", "D4", null, "E4", "G4", null, "C4", null, null],
        "8n"
      );

      const bassline = new Tone.Sequence(
        (time, note) => {
          bass.triggerAttackRelease(note, "2n", time);
        },
        ["C2", "G1", "A1", "F2"],
        "2n"
      );

      nodesRef.current = {
        gain,
        instruments: [lead, bass],
        sequences: [melody, bassline],
      };

      melody.start(0);
      bassline.start(0);
      Tone.Transport.bpm.rampTo(108, 0.5);

      currentTrackRef.current = trackId ?? null;
      if (trackId) {
        console.log(`Switching to track: ${trackId}`);
      }
    }

    if (Tone.Transport.state !== "started") {
      Tone.Transport.start();
    }

    const gainNode = nodesRef.current.gain;
    const targetVolume = Math.min(Math.max(volume, 0), 1);
    gainNode.gain.rampTo(targetVolume, 0.5);

    return undefined;
  }, [shouldPlay, stop, toneReady, trackId, volume]);

  useEffect(() => {
    if (!nodesRef.current || !shouldPlay) {
      if (trackId && !shouldPlay) {
        currentTrackRef.current = trackId;
      }
      return undefined;
    }

    if (!trackId || currentTrackRef.current === trackId) {
      return undefined;
    }

    const Tone = window.Tone;
    const gainNode = nodesRef.current.gain;

    if (!Tone || !gainNode) {
      console.log(`Switching to track: ${trackId}`);
      currentTrackRef.current = trackId;
      return undefined;
    }

    const now = Tone.now();
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.rampTo(0, 0.5);

    if (crossfadeTimeoutRef.current) {
      window.clearTimeout(crossfadeTimeoutRef.current);
    }

    crossfadeTimeoutRef.current = window.setTimeout(() => {
      console.log(`Switching to track: ${trackId}`);
      currentTrackRef.current = trackId;
      const targetVolume = Math.min(Math.max(volume, 0), 1);
      gainNode.gain.rampTo(targetVolume, 0.5);
      crossfadeTimeoutRef.current = null;
    }, 500);

    return () => {
      if (crossfadeTimeoutRef.current) {
        window.clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = null;
      }
    };
  }, [trackId, shouldPlay, volume]);

  useEffect(() => {
    if (!nodesRef.current) {
      return;
    }

    const gainNode = nodesRef.current.gain;
    const targetVolume = Math.min(Math.max(volume, 0), 1);

    gainNode.gain.rampTo(targetVolume, 0.15);
  }, [volume]);

  return { stop };
}
