/* eslint-disable no-param-reassign */
const NOTE_INDEX = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

const A4_FREQUENCY = 440;
const A4_MIDI = 69;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createNoiseBuffer = (context, duration = 1) => {
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, duration * sampleRate, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

const noteToFrequency = (note) => {
  if (typeof note === "number") return note;
  if (typeof note !== "string") return 0;
  const match = note.trim().match(/^([A-Ga-g])(b|#)?(\d)$/);
  if (!match) return 0;
  const [, letterRaw, accidental, octaveRaw] = match;
  const letter = letterRaw.toUpperCase();
  const accidentalKey = accidental ? `${letter}${accidental}` : letter;
  const semitone = NOTE_INDEX[accidentalKey];
  if (typeof semitone !== "number") return 0;
  const octave = Number(octaveRaw);
  const midi = semitone + (octave + 1) * 12;
  const frequency = A4_FREQUENCY * 2 ** ((midi - A4_MIDI) / 12);
  return frequency;
};

const createAdsr = (gainParam, startTime, duration, adsr) => {
  const { attack = 0.01, decay = 0.1, sustain = 0.7, release = 0.1 } = adsr || {};
  const attackEnd = startTime + attack;
  const decayEnd = attackEnd + decay;
  const sustainLevel = clamp(sustain, 0, 1);

  gainParam.cancelScheduledValues(startTime);
  gainParam.setValueAtTime(0.0001, startTime);
  gainParam.linearRampToValueAtTime(1, attackEnd);
  gainParam.linearRampToValueAtTime(sustainLevel, decayEnd);
  const releaseStart = startTime + duration;
  gainParam.setValueAtTime(sustainLevel, releaseStart);
  gainParam.linearRampToValueAtTime(0.0001, releaseStart + release);
};

const createStereoPanner = (context, panValue) => {
  if (typeof context.createStereoPanner === "function") {
    const panner = context.createStereoPanner();
    panner.pan.value = clamp(panValue, -1, 1);
    return { input: panner, output: panner };
  }
  const merger = context.createChannelMerger(2);
  const gainL = context.createGain();
  const gainR = context.createGain();
  const pan = clamp((panValue + 1) / 2, 0, 1);
  gainL.gain.value = 1 - pan;
  gainR.gain.value = pan;
  gainL.connect(merger, 0, 0);
  gainR.connect(merger, 0, 1);
  const input = context.createGain();
  input.connect(gainL);
  input.connect(gainR);
  return {
    input,
    output: merger,
    connect(destination) {
      merger.connect(destination);
    },
    disconnect() {
      merger.disconnect();
    },
  };
};

const createReverbImpulse = (context, duration = 2.5, decay = 2) => {
  const rate = context.sampleRate;
  const length = rate * duration;
  const impulse = context.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  return impulse;
};

const createPingPongDelay = (context, delayTime = 0.25, feedbackAmount = 0.35) => {
  const delayL = context.createDelay();
  const delayR = context.createDelay();
  delayL.delayTime.value = delayTime;
  delayR.delayTime.value = delayTime;

  const feedback = context.createGain();
  feedback.gain.value = feedbackAmount;

  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);

  const input = context.createGain();
  const output = context.createGain();

  input.connect(splitter);
  splitter.connect(delayL, 0);
  splitter.connect(delayR, 1);
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);
  merger.connect(output);

  delayL.connect(delayR);
  delayR.connect(delayL);
  merger.connect(feedback);
  feedback.connect(input);

  return { input, output };
};

const createBitCrusher = (context, reduction = 4, mix = 0.5) => {
  const input = context.createGain();
  const output = context.createGain();
  const dry = context.createGain();
  const wet = context.createGain();
  dry.gain.value = 1 - mix;
  wet.gain.value = mix;

  const processor = context.createScriptProcessor(256, 1, 1);
  let last = 0;
  let counter = 0;
  processor.onaudioprocess = (event) => {
    const inputBuffer = event.inputBuffer.getChannelData(0);
    const outputBuffer = event.outputBuffer.getChannelData(0);
    const step = 2 ** reduction;
    for (let i = 0; i < inputBuffer.length; i += 1) {
      counter += reduction;
      if (counter >= 1) {
        counter -= 1;
        last = Math.round(inputBuffer[i] * step) / step;
      }
      outputBuffer[i] = last;
    }
  };

  input.connect(dry);
  input.connect(processor);
  processor.connect(wet);
  dry.connect(output);
  wet.connect(output);

  return { input, output, dispose: () => processor.disconnect() };
};

class LoopTrack {
  constructor(context, destination, tempo, bars, schedule) {
    this.context = context;
    this.destination = destination;
    this.tempo = tempo;
    this.bars = bars;
    this.schedule = schedule;
    this.loopLength = bars * 4 * (60 / tempo);
    this.trackGain = context.createGain();
    this.trackGain.gain.setValueAtTime(0, context.currentTime);
    this.trackGain.connect(destination);
    this.timer = null;
    this.isPlaying = false;
  }

  start(fade = 0.8) {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const now = this.context.currentTime;
    this.trackGain.gain.cancelScheduledValues(now);
    this.trackGain.gain.setValueAtTime(0.0001, now);
    this.trackGain.gain.linearRampToValueAtTime(1, now + fade);
    const firstTime = now + 0.1;
    this.scheduleCycle(firstTime);
  }

  scheduleCycle(time) {
    if (!this.isPlaying) return;
    this.schedule(time, this.trackGain, this.loopLength);
    const next = time + this.loopLength;
    const delay = Math.max(0, (next - this.context.currentTime - 0.1) * 1000);
    this.timer = setTimeout(() => this.scheduleCycle(next), delay);
  }

  stop(fade = 0.8) {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const now = this.context.currentTime;
    this.trackGain.gain.cancelScheduledValues(now);
    const currentValue = this.trackGain.gain.value;
    this.trackGain.gain.setValueAtTime(currentValue, now);
    this.trackGain.gain.linearRampToValueAtTime(0.0001, now + fade);
  }

  connect(destination) {
    this.trackGain.disconnect();
    this.trackGain.connect(destination);
  }
}

const scheduleSimpleTone = (
  context,
  options
) => {
  const {
    destination,
    type = "sine",
    frequency,
    startTime,
    duration,
    adsr,
    detune = 0,
  } = options;
  const osc = context.createOscillator();
  osc.type = type;
  if (typeof frequency === "function") {
    frequency(osc.frequency, startTime, duration);
  } else {
    const freqValue = noteToFrequency(frequency);
    osc.frequency.setValueAtTime(freqValue, startTime);
  }
  if (detune) {
    osc.detune.setValueAtTime(detune, startTime);
  }
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  createAdsr(gain.gain, startTime, duration, adsr);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(startTime);
  osc.stop(startTime + duration + (adsr?.release ?? 0.1) + 1);
};

const scheduleNoiseHit = (
  context,
  options
) => {
  const {
    destination,
    startTime,
    duration,
    adsr,
    filterType,
    frequency,
    q = 1,
  } = options;
  const bufferSource = context.createBufferSource();
  bufferSource.buffer = createNoiseBuffer(context, duration + 1);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  createAdsr(gain.gain, startTime, duration, adsr);
  let nodeChain = gain;
  if (filterType) {
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    if (frequency) {
      filter.frequency.setValueAtTime(frequency, startTime);
    }
    filter.Q.value = q;
    bufferSource.connect(filter);
    filter.connect(gain);
  } else {
    bufferSource.connect(gain);
  }
  nodeChain.connect(destination);
  bufferSource.start(startTime);
  bufferSource.stop(startTime + duration + (adsr?.release ?? 0.1) + 1);
};

const TRACK_BUILDERS = {
  classic_dark: (context, destination) => {
    const tempo = 90;
    return new LoopTrack(context, destination, tempo, 4, (startTime, trackGain) => {
      const beat = 60 / tempo;
      const sixteenth = beat / 4;
      const padDuration = beat * 16;

      const padFilterL = context.createBiquadFilter();
      padFilterL.type = "lowpass";
      padFilterL.frequency.setValueAtTime(600, startTime);
      const padFilterR = context.createBiquadFilter();
      padFilterR.type = "lowpass";
      padFilterR.frequency.setValueAtTime(600, startTime);

      const panL = createStereoPanner(context, -0.6);
      const panR = createStereoPanner(context, 0.6);
      padFilterL.connect(panL.input);
      padFilterR.connect(panR.input);
      panL.output.connect(trackGain);
      panR.output.connect(trackGain);

      scheduleSimpleTone(context, {
        destination: padFilterL,
        type: "sawtooth",
        frequency: "A2",
        startTime,
        duration: padDuration,
        adsr: { attack: 2, decay: 1, sustain: 0.7, release: 3 },
      });
      scheduleSimpleTone(context, {
        destination: padFilterR,
        type: "sawtooth",
        frequency: "A2",
        detune: 7,
        startTime,
        duration: padDuration,
        adsr: { attack: 2, decay: 1, sustain: 0.7, release: 3 },
      });

      const arpDelay = createPingPongDelay(context, 0.25, 0.35);
      arpDelay.output.connect(trackGain);
      const arpNotes = ["C4", "Eb4", "G4", "Bb4"];
      for (let step = 0; step < 64; step += 1) {
        const note = arpNotes[step % arpNotes.length];
        const time = startTime + step * sixteenth;
        scheduleSimpleTone(context, {
          destination: arpDelay.input,
          type: "square",
          frequency: note,
          startTime: time,
          duration: sixteenth * 0.9,
          adsr: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.2 },
        });
      }

      for (let bar = 0; bar < 4; bar += 1) {
        const barOffset = startTime + bar * beat * 4;
        scheduleSimpleTone(context, {
          destination: trackGain,
          type: "sine",
          frequency: (param, t) => {
            param.setValueAtTime(120, t);
            param.exponentialRampToValueAtTime(50, t + 0.2);
          },
          startTime: barOffset,
          duration: 0.2,
          adsr: { attack: 0.001, decay: 0.1, sustain: 0.001, release: 0.05 },
        });
        scheduleNoiseHit(context, {
          destination: trackGain,
          startTime: barOffset + beat * 2,
          duration: 0.25,
          adsr: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.2 },
          filterType: "bandpass",
          frequency: 2000,
          q: 6,
        });
        for (let eighth = 0; eighth < 8; eighth += 1) {
          const time = barOffset + eighth * (beat / 2);
          scheduleNoiseHit(context, {
            destination: trackGain,
            startTime: time,
            duration: 0.05,
            adsr: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
            filterType: "highpass",
            frequency: 8000,
          });
        }
      }
    });
  },
  romantic_glow: (context, destination) => {
    const tempo = 100;
    const reverb = context.createConvolver();
    reverb.buffer = createReverbImpulse(context, 3.5, 3);
    reverb.connect(destination);
    return new LoopTrack(context, destination, tempo, 4, (startTime, trackGain) => {
      const beat = 60 / tempo;
      const chords = [
        ["F3", "A3", "C4", "E4"],
        ["G3", "Bb3", "D4", "F4"],
        ["A3", "C4", "E4", "G4"],
        ["Bb3", "D4", "F4", "A4"],
      ];
      chords.forEach((chord, index) => {
        const chordStart = startTime + index * beat * 4;
        chord.forEach((note, voice) => {
          const detune = voice % 2 === 0 ? 5 : -5;
          scheduleSimpleTone(context, {
            destination: trackGain,
            type: "sawtooth",
            frequency: note,
            detune,
            startTime: chordStart,
            duration: beat * 4,
            adsr: { attack: 1.5, decay: 0.8, sustain: 0.8, release: 2 },
          });
        });
      });

      const leadGain = context.createGain();
      leadGain.gain.setValueAtTime(0.8, startTime);
      leadGain.connect(reverb);
      leadGain.connect(trackGain);
      const vibrato = context.createOscillator();
      vibrato.frequency.value = 5;
      const vibratoGain = context.createGain();
      const cents = 10;
      const amount = (Math.pow(2, cents / 1200) - 1) * 440;
      vibratoGain.gain.value = amount;
      vibrato.connect(vibratoGain);

      const leadSteps = ["C5", "D5", "F5", "G5", "A5", "G5", "F5", "D5"];
      leadSteps.forEach((note, index) => {
        const time = startTime + index * beat * 2;
        scheduleSimpleTone(context, {
          destination: leadGain,
          type: "sine",
          frequency: (param, t, duration) => {
            const freq = noteToFrequency(note);
            param.setValueAtTime(freq, t);
            vibratoGain.connect(param);
          },
          startTime: time,
          duration: beat * 2,
          adsr: { attack: 0.2, decay: 0.4, sustain: 0.6, release: 1.5 },
        });
      });
      vibrato.start(startTime);
      vibrato.stop(startTime + beat * 16 + 2);

      for (let bar = 0; bar < 4; bar += 1) {
        const barStart = startTime + bar * beat * 4;
        scheduleSimpleTone(context, {
          destination: trackGain,
          type: "sine",
          frequency: (param, t) => {
            param.setValueAtTime(60, t);
            param.exponentialRampToValueAtTime(45, t + 0.2);
          },
          startTime: barStart,
          duration: 0.3,
          adsr: { attack: 0.001, decay: 0.1, sustain: 0.001, release: 0.1 },
        });
        scheduleNoiseHit(context, {
          destination: trackGain,
          startTime: barStart + beat * 2,
          duration: 0.2,
          adsr: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
          filterType: "bandpass",
          frequency: 1800,
          q: 4,
        });
        for (let eighth = 0; eighth < 8; eighth += 1) {
          const time = barStart + eighth * (beat / 2);
          scheduleNoiseHit(context, {
            destination: trackGain,
            startTime: time,
            duration: 0.05,
            adsr: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
            filterType: "highpass",
            frequency: 9000,
          });
        }
      }
    });
  },
  playful_neon: (context, destination) => {
    const tempo = 128;
    return new LoopTrack(context, destination, tempo, 8, (startTime, trackGain) => {
      const beat = 60 / tempo;
      const sixteenth = beat / 4;
      const bassPattern = ["C2", "G2", "A2", "F2"];
      for (let bar = 0; bar < 8; bar += 1) {
        for (let beatIndex = 0; beatIndex < 4; beatIndex += 1) {
          const note = bassPattern[(bar + beatIndex) % bassPattern.length];
          const time = startTime + bar * 4 * beat + beatIndex * beat;
          scheduleSimpleTone(context, {
            destination: trackGain,
            type: "square",
            frequency: note,
            startTime: time,
            duration: beat * 0.9,
            adsr: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 },
          });
        }
      }
      const arpNotes = ["C4", "E4", "G4", "Bb4", "D5"];
      for (let step = 0; step < 8 * 16 * 2; step += 1) {
        const note = arpNotes[step % arpNotes.length];
        const time = startTime + step * sixteenth;
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1200, time);
        const lfo = context.createOscillator();
        lfo.frequency.value = 2;
        const lfoGain = context.createGain();
        lfoGain.gain.value = 400;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start(time);
        lfo.stop(time + sixteenth * 4);
        scheduleSimpleTone(context, {
          destination: filter,
          type: "sawtooth",
          frequency: note,
          startTime: time,
          duration: sixteenth * 0.9,
          adsr: { attack: 0.02, decay: 0.08, sustain: 0.5, release: 0.2 },
        });
        filter.connect(trackGain);
      }

      for (let bar = 0; bar < 8; bar += 1) {
        const barStart = startTime + bar * beat * 4;
        scheduleSimpleTone(context, {
          destination: trackGain,
          type: "sine",
          frequency: (param, t) => {
            param.setValueAtTime(70, t);
            param.exponentialRampToValueAtTime(40, t + 0.25);
          },
          startTime: barStart,
          duration: 0.3,
          adsr: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1 },
        });
        scheduleNoiseHit(context, {
          destination: trackGain,
          startTime: barStart + beat * 2,
          duration: 0.2,
          adsr: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.15 },
          filterType: "bandpass",
          frequency: 2500,
          q: 5,
        });
        for (let step = 0; step < 16; step += 1) {
          const time = barStart + step * sixteenth;
          scheduleNoiseHit(context, {
            destination: trackGain,
            startTime: time,
            duration: 0.04,
            adsr: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.03 },
            filterType: "highpass",
            frequency: 10000,
          });
        }
      }

      const riserStart = startTime + beat * 32 - 2;
      const riserSource = context.createBufferSource();
      riserSource.buffer = createNoiseBuffer(context, 4);
      const riserGain = context.createGain();
      riserGain.gain.setValueAtTime(0.0001, riserStart);
      riserGain.linearRampToValueAtTime(0.4, riserStart + 2);
      const riserFilter = context.createBiquadFilter();
      riserFilter.type = "highpass";
      riserFilter.frequency.setValueAtTime(400, riserStart);
      riserFilter.frequency.linearRampToValueAtTime(8000, riserStart + 2);
      riserSource.connect(riserFilter);
      riserFilter.connect(riserGain);
      riserGain.connect(trackGain);
      riserSource.start(riserStart);
      riserSource.stop(riserStart + 2.5);
    });
  },
  mystic_night: (context, destination) => {
    const tempo = 70;
    const reverb = context.createConvolver();
    reverb.buffer = createReverbImpulse(context, 4.5, 4);
    reverb.connect(destination);
    return new LoopTrack(context, destination, tempo, 16, (startTime, trackGain) => {
      const beat = 60 / tempo;
      const padNotes = ["C2", "G2", "D3"];
      padNotes.forEach((note, index) => {
        scheduleSimpleTone(context, {
          destination: trackGain,
          type: "triangle",
          frequency: note,
          detune: index * 3,
          startTime,
          duration: beat * 64,
          adsr: { attack: 4, decay: 2, sustain: 0.6, release: 6 },
        });
      });
      scheduleSimpleTone(context, {
        destination: trackGain,
        type: "sine",
        frequency: "E1",
        startTime,
        duration: beat * 64,
        adsr: { attack: 3, decay: 1, sustain: 0.9, release: 6 },
      });

      for (let i = 0; i < 32; i += 1) {
        const choice = ["C5", "G5", "A5"][Math.floor(Math.random() * 3)];
        const time = startTime + i * beat * 2 + Math.random() * beat;
        scheduleSimpleTone(context, {
          destination: reverb,
          type: "sine",
          frequency: choice,
          startTime: time,
          duration: 0.6,
          adsr: { attack: 0.1, decay: 1, sustain: 0, release: 2 },
        });
      }
      const tomTime = startTime + beat * 32;
      scheduleSimpleTone(context, {
        destination: trackGain,
        type: "sine",
        frequency: (param, t) => {
          param.setValueAtTime(120, t);
          param.exponentialRampToValueAtTime(50, t + 0.6);
        },
        startTime: tomTime,
        duration: 0.8,
        adsr: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.5 },
      });
    });
  },
  custom_1_chillwave: (context, destination) => {
    const tempo = 85;
    const reverb = context.createConvolver();
    reverb.buffer = createReverbImpulse(context, 3, 2.5);
    reverb.connect(destination);
    return new LoopTrack(context, destination, tempo, 4, (startTime, trackGain) => {
      const beat = 60 / tempo;
      const chords = [
        ["A3", "C4", "E4", "G4"],
        ["F3", "A3", "C4", "E4"],
        ["C3", "E3", "G3", "B3"],
        ["G3", "B3", "D4", "F4"],
      ];
      chords.forEach((chord, index) => {
        const time = startTime + index * beat * 4;
        chord.forEach((note, voice) => {
          const detune = voice % 2 === 0 ? 5 : -5;
          scheduleSimpleTone(context, {
            destination: trackGain,
            type: "sawtooth",
            frequency: note,
            detune,
            startTime: time,
            duration: beat * 4,
            adsr: { attack: 0.8, decay: 0.6, sustain: 0.8, release: 2 },
          });
        });
      });
      const melodyNotes = ["E5", "D5", "C5", "B4", "C5", "D5", "E5", "G5"];
      melodyNotes.forEach((note, index) => {
        const time = startTime + index * beat * 2;
        const chorusDelay = context.createDelay();
        chorusDelay.delayTime.value = 0.02 + Math.sin(index) * 0.01;
        const chorusGain = context.createGain();
        chorusGain.gain.value = 0.4;
        chorusDelay.connect(chorusGain);
        chorusGain.connect(trackGain);
        scheduleSimpleTone(context, {
          destination: trackGain,
          type: "sine",
          frequency: note,
          startTime: time,
          duration: beat * 2,
          adsr: { attack: 0.2, decay: 0.5, sustain: 0.7, release: 1.5 },
        });
        scheduleSimpleTone(context, {
          destination: chorusDelay,
          type: "sine",
          frequency: note,
          startTime: time + 0.05,
          duration: beat * 2,
          adsr: { attack: 0.3, decay: 0.5, sustain: 0.6, release: 1.5 },
        });
      });
      for (let bar = 0; bar < 4; bar += 1) {
        const barStart = startTime + bar * beat * 4;
        scheduleSimpleTone(context, {
          destination: trackGain,
          type: "sine",
          frequency: (param, t) => {
            param.setValueAtTime(55, t);
            param.exponentialRampToValueAtTime(45, t + 0.2);
          },
          startTime: barStart,
          duration: 0.25,
          adsr: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1 },
        });
        scheduleNoiseHit(context, {
          destination: trackGain,
          startTime: barStart + beat * 2,
          duration: 0.2,
          adsr: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.18 },
          filterType: "bandpass",
          frequency: 1600,
          q: 3,
        });
        for (let eighth = 0; eighth < 8; eighth += 1) {
          const time = barStart + eighth * (beat / 2);
          scheduleNoiseHit(context, {
            destination: trackGain,
            startTime: time,
            duration: 0.05,
            adsr: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.04 },
            filterType: "highpass",
            frequency: 9000,
          });
        }
      }
    });
  },
  custom_2_arcade: (context, destination) => {
    const tempo = 140;
    const effectGain = context.createGain();
    const crusher = createBitCrusher(context, 5, 0.4);
    effectGain.connect(crusher.input);
    crusher.output.connect(destination);
    return new LoopTrack(context, effectGain, tempo, 2, (startTime, trackGain) => {
      const beat = 60 / tempo;
      const sixteenth = beat / 4;
      const bassNotes = ["C3", "E3", "G3", "A3"];
      for (let i = 0; i < 8; i += 1) {
        const note = bassNotes[i % bassNotes.length];
        const time = startTime + i * beat;
        scheduleSimpleTone(context, {
          destination: trackGain,
          type: "square",
          frequency: note,
          startTime: time,
          duration: beat * 0.5,
          adsr: { attack: 0.01, decay: 0.08, sustain: 0.4, release: 0.1 },
        });
      }
      const melody = ["C5", "E5", "G5", "C6"];
      for (let step = 0; step < 32; step += 1) {
        const note = melody[step % melody.length];
        const time = startTime + step * sixteenth;
        scheduleSimpleTone(context, {
          destination: trackGain,
          type: "triangle",
          frequency: note,
          startTime: time,
          duration: sixteenth * 0.9,
          adsr: { attack: 0.01, decay: 0.07, sustain: 0.5, release: 0.1 },
        });
      }
      for (let bar = 0; bar < 2; bar += 1) {
        const barStart = startTime + bar * beat * 4;
        scheduleSimpleTone(context, {
          destination: trackGain,
          type: "sine",
          frequency: (param, t) => {
            param.setValueAtTime(90, t);
            param.exponentialRampToValueAtTime(45, t + 0.18);
          },
          startTime: barStart,
          duration: 0.25,
          adsr: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1 },
        });
        scheduleNoiseHit(context, {
          destination: trackGain,
          startTime: barStart + beat * 2,
          duration: 0.15,
          adsr: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
          filterType: "bandpass",
          frequency: 3000,
          q: 5,
        });
        for (let step = 0; step < 16; step += 1) {
          const time = barStart + step * sixteenth;
          scheduleNoiseHit(context, {
            destination: trackGain,
            startTime: time,
            duration: 0.04,
            adsr: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.03 },
            filterType: "highpass",
            frequency: 11000,
          });
        }
      }
    });
  },
  custom_3_ambient: (context, destination) => {
    const tempo = 30;
    const reverb = context.createConvolver();
    reverb.buffer = createReverbImpulse(context, 5, 5);
    reverb.connect(destination);
    return new LoopTrack(context, destination, tempo, 64, (startTime, trackGain, loopLength) => {
      const padDuration = loopLength;
      ["C3", "G3", "D4"].forEach((note, index) => {
        scheduleSimpleTone(context, {
          destination: trackGain,
          type: index % 2 === 0 ? "sine" : "triangle",
          frequency: note,
          startTime,
          duration: padDuration,
          adsr: { attack: 5, decay: 3, sustain: 0.8, release: 8 },
        });
      });
      const noiseSource = context.createBufferSource();
      noiseSource.buffer = createNoiseBuffer(context, padDuration + 5);
      const noiseFilter = context.createBiquadFilter();
      noiseFilter.type = "highpass";
      noiseFilter.frequency.setValueAtTime(10000, startTime);
      const noiseGain = context.createGain();
      noiseGain.gain.setValueAtTime(0.05, startTime);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(trackGain);
      noiseSource.start(startTime);
      noiseSource.stop(startTime + padDuration + 2);

      let pingTime = startTime + 5;
      while (pingTime < startTime + loopLength) {
        const note = ["C5", "E5", "G5", "B5"][Math.floor(Math.random() * 4)];
        scheduleSimpleTone(context, {
          destination: reverb,
          type: "sine",
          frequency: note,
          startTime: pingTime,
          duration: 1.2,
          adsr: { attack: 0.2, decay: 1, sustain: 0, release: 3 },
        });
        pingTime += 5 + Math.random() * 5;
      }
    });
  },
};

const SFX_BUILDERS = {
  click: (context, destination) => {
    const now = context.currentTime + 0.01;
    scheduleSimpleTone(context, {
      destination,
      type: "square",
      frequency: "A5",
      startTime: now,
      duration: 0.1,
      adsr: { attack: 0.001, decay: 0.05, sustain: 0.2, release: 0.08 },
    });
  },
  modal_open: (context, destination) => {
    const now = context.currentTime + 0.01;
    scheduleNoiseHit(context, {
      destination,
      startTime: now,
      duration: 0.5,
      adsr: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 0.2 },
      filterType: "bandpass",
      frequency: 1000,
      q: 1.5,
    });
    scheduleSimpleTone(context, {
      destination,
      type: "sine",
      frequency: (param, t) => {
        param.setValueAtTime(400, t);
        param.exponentialRampToValueAtTime(1200, t + 0.5);
      },
      startTime: now,
      duration: 0.5,
      adsr: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.2 },
    });
  },
  modal_close: (context, destination) => {
    const now = context.currentTime + 0.01;
    scheduleSimpleTone(context, {
      destination,
      type: "sine",
      frequency: (param, t) => {
        param.setValueAtTime(1200, t);
        param.exponentialRampToValueAtTime(400, t + 0.5);
      },
      startTime: now,
      duration: 0.5,
      adsr: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.2 },
    });
  },
  spin_start: (context, destination) => {
    const now = context.currentTime + 0.01;
    scheduleSimpleTone(context, {
      destination,
      type: "sawtooth",
      frequency: (param, t) => {
        param.setValueAtTime(200, t);
        param.exponentialRampToValueAtTime(2000, t + 1);
      },
      startTime: now,
      duration: 1,
      adsr: { attack: 0.01, decay: 0.4, sustain: 0.5, release: 0.3 },
    });
    const noise = context.createBufferSource();
    noise.buffer = createNoiseBuffer(context, 1);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now + 0.7);
    gain.linearRampToValueAtTime(0.3, now + 1);
    noise.connect(gain);
    gain.connect(destination);
    noise.start(now + 0.6);
    noise.stop(now + 1.2);
  },
  spin_end: (context, destination) => {
    const now = context.currentTime + 0.01;
    for (let i = 0; i < 3; i += 1) {
      const time = now + i * 0.1;
      scheduleSimpleTone(context, {
        destination,
        type: "sine",
        frequency: 600,
        startTime: time,
        duration: 0.08,
        adsr: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      });
    }
    scheduleSimpleTone(context, {
      destination,
      type: "sine",
      frequency: 200,
      startTime: now + 0.35,
      duration: 0.2,
      adsr: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.2 },
    });
  },
  success: (context, destination) => {
    const now = context.currentTime + 0.01;
    const notes = ["C5", "E5", "G5"];
    notes.forEach((note, index) => {
      const time = now + index * 0.2;
      scheduleSimpleTone(context, {
        destination,
        type: "sine",
        frequency: note,
        startTime: time,
        duration: 0.6,
        adsr: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 },
      });
    });
  },
  extreme_fanfare: (context, destination) => {
    const now = context.currentTime + 0.01;
    const notes = ["C4", "E4", "G4", "B4", "C5"];
    notes.forEach((note, index) => {
      const time = now + index * 0.125;
      scheduleSimpleTone(context, {
        destination,
        type: "sawtooth",
        frequency: note,
        startTime: time,
        duration: 0.25,
        adsr: { attack: 0.005, decay: 0.1, sustain: 0.5, release: 0.25 },
      });
    });
    ["C4", "E4", "G4"].forEach((note) => {
      scheduleSimpleTone(context, {
        destination,
        type: "sawtooth",
        frequency: note,
        startTime: now + 0.62,
        duration: 0.8,
        adsr: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.4 },
      });
    });
    const sparkle = context.createBufferSource();
    sparkle.buffer = createNoiseBuffer(context, 1);
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(8000, now + 0.6);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now + 0.6);
    gain.linearRampToValueAtTime(0.5, now + 0.9);
    gain.linearRampToValueAtTime(0, now + 1.2);
    sparkle.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    sparkle.start(now + 0.6);
    sparkle.stop(now + 1.3);
  },
};

const STORAGE_KEYS = {
  volume: "audio.volume",
  musicVolume: "audio.musicVolume",
  sfxVolume: "audio.sfxVolume",
  muted: "audio.muted",
  track: "audio.track",
};

const getStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (error) {
    console.warn("localStorage unavailable", error);
    return null;
  }
};

const readNumberSetting = (key, fallback) => {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) return fallback;
    return clamp(value, 0, 1);
  } catch (error) {
    console.warn(`Failed to read ${key}`, error);
    return fallback;
  }
};

const readBooleanSetting = (key, fallback) => {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    return raw === "true";
  } catch (error) {
    console.warn(`Failed to read ${key}`, error);
    return fallback;
  }
};

const writeSetting = (key, value) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to persist ${key}`, error);
  }
};

export class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.volume = readNumberSetting(STORAGE_KEYS.volume, 0.8);
    this.musicVolume = readNumberSetting(STORAGE_KEYS.musicVolume, 0.8);
    this.sfxVolume = readNumberSetting(STORAGE_KEYS.sfxVolume, 0.8);
    this.muted = readBooleanSetting(STORAGE_KEYS.muted, false);
    this.currentTrack = null;
    this.currentTrackName = null;
    this.trackFactories = TRACK_BUILDERS;
    this.sfxFactories = SFX_BUILDERS;
    this.listeners = new Set();
    const storage = getStorage();
    if (storage) {
      const storedTrack = storage.getItem(STORAGE_KEYS.track);
      if (storedTrack && this.trackFactories[storedTrack]) {
        this.currentTrackName = storedTrack;
      }
    }
  }

  ensureContext() {
    if (typeof window === "undefined") return;
    if (!this.context) {
      const AudioContextRef = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextRef) {
        console.warn("Web Audio API not supported");
        return;
      }
      this.context = new AudioContextRef();
      this.masterGain = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.sfxGain.gain.value = this.sfxVolume;
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);
    }
    if (this.context?.state === "suspended") {
      this.context.resume();
    }
  }

  getState() {
    return {
      volume: this.volume,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      muted: this.muted,
      track: this.currentTrackName,
    };
  }

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error("Audio listener error", error);
      }
    });
  }

  playTrack(trackName) {
    const factory = this.trackFactories[trackName];
    if (!factory) return;
    this.ensureContext();
    if (!this.context) return;
    if (this.currentTrackName === trackName) {
      return;
    }
    const newTrack = factory(this.context, this.musicGain);
    newTrack.start(1);
    if (this.currentTrack) {
      this.currentTrack.stop(1);
    }
    this.currentTrack = newTrack;
    this.currentTrackName = trackName;
    writeSetting(STORAGE_KEYS.track, trackName);
    this.emit();
  }

  stopTrack() {
    if (this.currentTrack) {
      this.currentTrack.stop(0.6);
      this.currentTrack = null;
      this.currentTrackName = null;
      this.emit();
    }
  }

  playSFX(name) {
    const factory = this.sfxFactories[name];
    if (!factory) return;
    this.ensureContext();
    if (!this.context) return;
    factory(this.context, this.sfxGain);
  }

  setVolume(value) {
    const next = clamp(Number(value), 0, 1);
    this.volume = next;
    if (this.masterGain) {
      const now = this.context.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      const target = this.muted ? 0 : next;
      this.masterGain.gain.setValueAtTime(target, now);
    }
    writeSetting(STORAGE_KEYS.volume, next.toString());
    this.emit();
  }

  setMusicVolume(value) {
    const next = clamp(Number(value), 0, 1);
    this.musicVolume = next;
    if (this.musicGain) {
      const now = this.context.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(next, now);
    }
    writeSetting(STORAGE_KEYS.musicVolume, next.toString());
    this.emit();
  }

  setSfxVolume(value) {
    const next = clamp(Number(value), 0, 1);
    this.sfxVolume = next;
    if (this.sfxGain) {
      const now = this.context.currentTime;
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.setValueAtTime(next, now);
    }
    writeSetting(STORAGE_KEYS.sfxVolume, next.toString());
    this.emit();
  }

  toggleMute() {
    const next = !this.muted;
    this.muted = next;
    this.ensureContext();
    if (this.masterGain) {
      const now = this.context.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(next ? 0 : this.volume, now);
    }
    writeSetting(STORAGE_KEYS.muted, next.toString());
    this.emit();
  }
}

export default AudioManager;
export const TRACK_NAMES = Object.keys(TRACK_BUILDERS);
