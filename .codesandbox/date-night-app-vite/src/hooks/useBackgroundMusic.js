diff --git a//dev/null b/.codesandbox/date-night-app-vite/src/hooks/useBackgroundMusic.js
index 0000000000000000000000000000000000000000..bcdb4facaa54759edb2e2619a8a18c2fead40dea 100644
--- a//dev/null
+++ b/.codesandbox/date-night-app-vite/src/hooks/useBackgroundMusic.js
@@ -0,0 +1,109 @@
+import { useCallback, useEffect, useRef } from "react";
+
+export function useBackgroundMusic(volume, shouldPlay, toneReady) {
+  const nodesRef = useRef(null);
+
+  const stop = useCallback(() => {
+    const Tone = window.Tone;
+    const resources = nodesRef.current;
+
+    if (!Tone || !resources) {
+      return;
+    }
+
+    resources.sequences.forEach((sequence) => {
+      sequence.stop();
+      sequence.dispose();
+    });
+
+    resources.instruments.forEach((instrument) => {
+      instrument.dispose();
+    });
+
+    resources.gain.dispose();
+    nodesRef.current = null;
+  }, []);
+
+  useEffect(() => stop, [stop]);
+
+  useEffect(() => {
+    const Tone = window.Tone;
+
+    if (!toneReady || !Tone) {
+      return undefined;
+    }
+
+    if (!shouldPlay) {
+      stop();
+      return undefined;
+    }
+
+    if (!nodesRef.current) {
+      const gain = new Tone.Gain(volume).toDestination();
+
+      const lead = new Tone.Synth({
+        oscillator: { type: "fmsine", modulationType: "triangle" },
+        envelope: { attack: 0.02, decay: 0.1, sustain: 0.4, release: 0.9 },
+      }).connect(gain);
+
+      const bass = new Tone.MonoSynth({
+        oscillator: { type: "square" },
+        envelope: { attack: 0.04, decay: 0.2, sustain: 0.5, release: 1.2 },
+        filterEnvelope: {
+          attack: 0.03,
+          decay: 0.2,
+          sustain: 0.2,
+          release: 0.9,
+          baseFrequency: 80,
+          octaves: 3,
+        },
+      }).connect(gain);
+
+      const melody = new Tone.Sequence(
+        (time, note) => {
+          if (note) {
+            lead.triggerAttackRelease(note, "16n", time);
+          }
+        },
+        ["G4", "A4", "C5", null, "A4", "G4", null, "E4", "D4", null, "E4", "G4", null, "C4", null, null],
+        "8n"
+      );
+
+      const bassline = new Tone.Sequence(
+        (time, note) => {
+          bass.triggerAttackRelease(note, "2n", time);
+        },
+        ["C2", "G1", "A1", "F2"],
+        "2n"
+      );
+
+      nodesRef.current = {
+        gain,
+        instruments: [lead, bass],
+        sequences: [melody, bassline],
+      };
+
+      melody.start(0);
+      bassline.start(0);
+      Tone.Transport.bpm.rampTo(108, 0.5);
+    }
+
+    if (Tone.Transport.state !== "started") {
+      Tone.Transport.start();
+    }
+
+    nodesRef.current.gain.gain.rampTo(volume, 0.2);
+
+    return undefined;
+  }, [shouldPlay, stop, toneReady, volume]);
+
+  useEffect(() => {
+    if (!nodesRef.current) {
+      return;
+    }
+
+    nodesRef.current.gain.gain.rampTo(volume, 0.15);
+  }, [volume]);
+
+  return { stop };
+}
