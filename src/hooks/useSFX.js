const MAX_POLYPHONY = 5;
const DEFAULT_GAIN = 0.4;
const ATTACK_TIME = 0.02;
const RELEASE_TIME = 0.05;

let audioContext;
const activeVoices = [];

function getAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }
    audioContext = new AudioCtx();
  }
  return audioContext;
}

function registerVoice(voice, ctx) {
  const cleanup = () => {
    const index = activeVoices.indexOf(voice);
    if (index !== -1) {
      activeVoices.splice(index, 1);
    }
    voice.oscillator.removeEventListener('ended', cleanup);
  };

  voice.oscillator.addEventListener('ended', cleanup);
  activeVoices.push(voice);

  if (activeVoices.length > MAX_POLYPHONY) {
    const oldest = activeVoices.shift();
    if (oldest) {
      fadeOutAndStop(oldest, ctx);
    }
  }
}

function fadeOutAndStop(voice, ctx) {
  const now = ctx.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + RELEASE_TIME);
  voice.oscillator.stop(now + RELEASE_TIME);
}

function createVoice(ctx, type) {
  const oscillator = ctx.createOscillator();
  oscillator.type = type;
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  const voice = { oscillator, gain };
  registerVoice(voice, ctx);
  return voice;
}

function scheduleEnvelope(gainNode, startTime, duration, peakGain = DEFAULT_GAIN) {
  const attack = Math.min(ATTACK_TIME, duration * 0.3);
  const release = Math.min(RELEASE_TIME, duration * 0.5);
  const sustainStart = startTime + attack;
  const releaseStart = Math.max(startTime + duration - release, sustainStart);
  const endTime = releaseStart + release;

  gainNode.gain.cancelScheduledValues(startTime);
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(peakGain, sustainStart);
  gainNode.gain.setValueAtTime(peakGain, releaseStart);
  gainNode.gain.linearRampToValueAtTime(0, endTime);

  return endTime;
}

function ensureContextAndPlay(playback) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  playback(ctx);
}

function scheduleTone({
  ctx,
  type,
  startFrequency,
  endFrequency,
  frequency,
  duration,
  offset = 0,
  gain = DEFAULT_GAIN,
}) {
  const voice = createVoice(ctx, type);
  const startTime = ctx.currentTime + offset;
  const envelopeEnd = scheduleEnvelope(voice.gain, startTime, duration, gain);

  if (typeof startFrequency === 'number' && typeof endFrequency === 'number') {
    voice.oscillator.frequency.setValueAtTime(startFrequency, startTime);
    voice.oscillator.frequency.linearRampToValueAtTime(endFrequency, startTime + duration);
  } else if (typeof frequency === 'number') {
    voice.oscillator.frequency.setValueAtTime(frequency, startTime);
  }

  voice.oscillator.start(startTime);
  voice.oscillator.stop(envelopeEnd + 0.01);
}

export function playModalOpen() {
  ensureContextAndPlay((ctx) => {
    scheduleTone({
      ctx,
      type: 'sine',
      startFrequency: 200,
      endFrequency: 600,
      duration: 0.3,
    });
  });
}

export function playModalClose() {
  ensureContextAndPlay((ctx) => {
    scheduleTone({
      ctx,
      type: 'sine',
      startFrequency: 600,
      endFrequency: 200,
      duration: 0.3,
    });
  });
}

export function playClick() {
  ensureContextAndPlay((ctx) => {
    scheduleTone({
      ctx,
      type: 'square',
      frequency: 400,
      duration: 0.15,
      gain: 0.3,
    });
  });
}

export function playWheelTick() {
  ensureContextAndPlay((ctx) => {
    scheduleTone({
      ctx,
      type: 'triangle',
      frequency: 300,
      duration: 0.1,
      gain: 0.25,
    });
  });
}

export function playAchievement() {
  ensureContextAndPlay((ctx) => {
    const noteDuration = 0.2;
    const notes = [261.63, 329.63, 392];

    notes.forEach((frequency, index) => {
      scheduleTone({
        ctx,
        type: 'sine',
        frequency,
        duration: noteDuration,
        offset: noteDuration * index,
        gain: 0.35,
      });
    });
  });
}
