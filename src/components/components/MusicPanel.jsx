import React, { useMemo } from "react";

import { MUSIC_TRACKS } from "../../hooks/useAudio";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const toPercent = (value) => Math.round(clamp(value, 0, 1) * 100);

const formatTrackLabel = (id) =>
  id
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const MusicPanel = ({ audio }) => {
  const trackOptions = useMemo(
    () =>
      Object.keys(MUSIC_TRACKS).map((trackId) => ({
        id: trackId,
        label: formatTrackLabel(trackId),
      })),
    []
  );

  const currentTrackId =
    audio?.music?.trackId ?? trackOptions[0]?.id ?? "classic-dark";
  const musicVolumePercent = toPercent(audio?.music?.volume ?? 0.8);
  const sfxVolumePercent = toPercent(audio?.sfx?.volume ?? 0.8);
  const isMuted = Boolean(audio?.muted);

  const handleMusicVolumeChange = (event) => {
    const nextValue = Number(event.target.value);
    if (Number.isNaN(nextValue)) {
      return;
    }
    audio?.music?.setVolume?.(clamp(nextValue, 0, 100) / 100);
  };

  const handleSfxVolumeChange = (event) => {
    const nextValue = Number(event.target.value);
    if (Number.isNaN(nextValue)) {
      return;
    }
    audio?.sfx?.setVolume?.(clamp(nextValue, 0, 100) / 100);
  };

  const handleTrackChange = (event) => {
    const nextTrackId = event.target.value;
    if (!nextTrackId || nextTrackId === currentTrackId) {
      return;
    }
    audio?.music?.setTrackId?.(nextTrackId);
  };

  const handleMuteToggle = () => {
    audio?.setMuted?.(!isMuted);
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-white/70">
        Fine-tune the vibe with soundtrack and effects levels. Preferences are
        saved locally so every session starts exactly how you like it.
      </p>
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            Music Volume
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={musicVolumePercent}
            onChange={handleMusicVolumeChange}
            className="accent-[var(--theme-primary)]"
          />
          <div className="flex justify-between text-xs text-white/60">
            <span>Muted</span>
            <span>{musicVolumePercent}%</span>
          </div>
        </label>

        <label className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            Effects Volume
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={sfxVolumePercent}
            onChange={handleSfxVolumeChange}
            className="accent-[var(--theme-primary)]"
          />
          <div className="flex justify-between text-xs text-white/60">
            <span>Muted</span>
            <span>{sfxVolumePercent}%</span>
          </div>
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            Global Mute
          </span>
          <button
            type="button"
            onClick={handleMuteToggle}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] ${
              isMuted
                ? "bg-white/20 text-white"
                : "bg-[var(--theme-primary)] text-black"
            }`}
          >
            {isMuted ? "Muted" : "Active"}
          </button>
        </label>

        <label className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            Soundtrack
          </span>
          <select
            value={currentTrackId}
            onChange={handleTrackChange}
            className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
          >
            {trackOptions.map((track) => (
              <option key={track.id} value={track.id}>
                {track.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
};

export default MusicPanel;
