import { useEffect, useRef, useState, useCallback } from "react";

export const MUSIC_TRACKS = {
  "classic-dark": "/audio/classic_dark.mp3",
  "romantic-glow": "/audio/romantic_glow.mp3",
  "playful-neon": "/audio/playful_neon.mp3",
  "mystic-night": "/audio/mystic_night.mp3",
  "custom-1-chillwave": "/audio/custom_1_chillwave.mp3",
  "custom-2-arcade": "/audio/custom_2_arcade.mp3",
  "custom-3-ambient": "/audio/custom_3_ambient.mp3",
};

export const SFX_FILES = {
  click: "/audio/click.wav",
  modal_open: "/audio/modal_open.wav",
  modal_close: "/audio/modal_close.wav",
  spin_start: "/audio/spin_start.wav",
  spin_end: "/audio/spin_end.wav",
  success: "/audio/success.wav",
  extreme_fanfare: "/audio/extreme_fanfare.wav",
};

const clamp01 = (value, fallback = 0.8) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 0), 1);
};

const getStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch (error) {
    console.warn("localStorage is not accessible", error);
    return null;
  }
};

const readNumberSetting = (key, fallback) => {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    return clamp01(Number(raw), fallback);
  } catch (error) {
    console.warn(`Failed to read audio setting "${key}"`, error);
    return fallback;
  }
};

const readBooleanSetting = (key, fallback) => {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    return storage.getItem(key) === "true";
  } catch (error) {
    console.warn(`Failed to read audio flag "${key}"`, error);
    return fallback;
  }
};

const writeSetting = (key, value) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to persist audio setting "${key}"`, error);
  }
};

export default function useAudio(initialTrackId = "classic-dark") {
  const [volume, setVolume] = useState(() => readNumberSetting("volume", 0.8));
  const [sfxVolume, setSfxVolume] = useState(() =>
    readNumberSetting("sfxVolume", 0.8)
  );
  const [muted, setMuted] = useState(() => readBooleanSetting("muted", false));
  const [trackId, setTrackId] = useState(initialTrackId);
  const musicRef = useRef(null);

  useEffect(() => {
    if (!MUSIC_TRACKS[trackId]) return;
    const audio = new Audio(MUSIC_TRACKS[trackId]);
    audio.loop = true;
    audio.volume = muted ? 0 : volume;
    audio.play().catch(() => {});
    musicRef.current = audio;
    return () => audio.pause();
  }, [trackId]);

  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = muted ? 0 : clamp01(volume);
    }
    writeSetting("volume", clamp01(volume).toString());
    writeSetting("sfxVolume", clamp01(sfxVolume).toString());
    writeSetting("muted", muted.toString());
  }, [volume, sfxVolume, muted]);

  const playSFX = useCallback(
    (id) => {
      if (!SFX_FILES[id]) return;
      const sfx = new Audio(SFX_FILES[id]);
      sfx.volume = muted ? 0 : sfxVolume;
      sfx.play().catch(() => {});
    },
    [sfxVolume, muted]
  );

  return {
    music: { trackId, setTrackId, volume, setVolume },
    sfx: { play: playSFX, volume: sfxVolume, setVolume: setSfxVolume },
    muted,
    setMuted,
  };
}
