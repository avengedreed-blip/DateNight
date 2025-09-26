import React from "react";

import { MUSIC_TRACK_OPTIONS } from "../../hooks/useMusic";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const MusicPanel = ({ music }) => {
  const currentTrackId = music?.currentTrackId ?? MUSIC_TRACK_OPTIONS[0]?.id;
  const volumePercent = Math.round(clamp((music?.volume ?? 1) * 100, 0, 100));
  const isMuted = Boolean(music?.isMuted);

  const handleVolumeChange = (event) => {
    const nextValue = Number(event.target.value);
    if (Number.isNaN(nextValue)) {
      return;
    }
    music?.setVolume?.(clamp(nextValue, 0, 100) / 100);
  };

  const handleTrackChange = (event) => {
    const nextTrackId = event.target.value;
    if (!nextTrackId) {
      return;
    }
    if (nextTrackId === currentTrackId) {
      return;
    }
    music?.playTrack?.(nextTrackId);
  };

  const handleMuteToggle = () => {
    music?.toggleMute?.();
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-white/70">
        Adjust the background soundtrack for your session. Volume and mute
        preferences are saved locally and synced across partners when possible.
      </p>
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            Volume
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={volumePercent}
            onChange={handleVolumeChange}
            className="accent-[var(--theme-primary)]"
          />
          <div className="flex justify-between text-xs text-white/60">
            <span>Muted</span>
            <span>{volumePercent}%</span>
          </div>
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            Mute
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
            {isMuted ? "Muted" : "On"}
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
            {MUSIC_TRACK_OPTIONS.map((track) => (
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
