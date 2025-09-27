import React, { useEffect, useMemo, useState } from "react";

import AvatarSelector from "./components/AvatarSelector";
import Modal from "./Modal";
import { THEMES } from "../themeConfig";

const TAB_DEFINITIONS = [
  { id: "themes", label: "Themes" },
  { id: "avatars", label: "Avatars" },
  { id: "music", label: "Music" },
];

const BASE_TRACK_IDS = [
  "classic-dark",
  "romantic-glow",
  "playful-neon",
  "mystic-night",
];

const normalizeTrackId = (trackId) =>
  typeof trackId === "string" ? trackId.replace(/_/g, "-") : trackId;

const denormalizeTrackId = (trackId) =>
  typeof trackId === "string" ? trackId.replace(/-/g, "_") : trackId;

const extractTrackId = (entry) => {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (typeof entry === "object") {
    return entry.id ?? entry.trackId ?? entry.key ?? null;
  }
  return null;
};

const formatTrackLabel = (trackId) => {
  if (!trackId || typeof trackId !== "string") return "Unknown";
  return trackId
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

export default function SettingsModal({
  open,
  onClose,
  profile,
  onAvatarChange = () => {},
  onThemeChange = () => {},
  themeKey,
  audio,
  music,
}) {
  const [activeTab, setActiveTab] = useState(TAB_DEFINITIONS[0].id);

  const controls = music ?? audio ?? {};
  const controlState = controls?.state ?? {};

  const resolvedThemeKey = themeKey ?? profile?.themeId ?? "classic-dark";
  const themeOptions = useMemo(() => Object.entries(THEMES ?? {}), []);

  const rawCurrentTrackId = extractTrackId(controlState.track);
  const normalizedCurrentTrack =
    normalizeTrackId(rawCurrentTrackId) ?? BASE_TRACK_IDS[0];

  const availableTrackIds = useMemo(() => {
    const ids = new Set(BASE_TRACK_IDS);

    const addTrack = (value) => {
      const id = normalizeTrackId(extractTrackId(value));
      if (id) {
        ids.add(id);
      }
    };

    const addFromCollection = (collection) => {
      if (!collection) return;
      if (Array.isArray(collection)) {
        collection.forEach(addTrack);
        return;
      }
      if (typeof collection === "object") {
        Object.keys(collection).forEach((key) => addTrack(key));
      }
    };

    addFromCollection(controls?.tracks);
    addFromCollection(controls?.availableTracks);
    addFromCollection(controlState?.tracks);
    addFromCollection(controlState?.availableTracks);
    addTrack(controlState.track);

    return Array.from(ids);
  }, [controlState, controls]);

  const isMuted = Boolean(controlState.muted);
  const volumeValue = (() => {
    const baseVolume =
      typeof controlState.volume === "number"
        ? controlState.volume
        : typeof controlState.musicVolume === "number"
        ? controlState.musicVolume
        : 0.8;
    return Math.round(Math.min(Math.max(baseVolume, 0), 1) * 100);
  })();

  useEffect(() => {
    if (open) {
      setActiveTab(TAB_DEFINITIONS[0].id);
    }
  }, [open]);

  const handleThemeSelect = (nextThemeKey) => {
    if (!nextThemeKey || nextThemeKey === resolvedThemeKey) return;
    onThemeChange(nextThemeKey);
  };

  const handleTrackSelect = (trackId) => {
    if (!trackId) return;
    const normalizedId = normalizeTrackId(trackId);
    const targetId = denormalizeTrackId(normalizedId);
    if (!targetId || targetId === rawCurrentTrackId) return;
    controls?.playTrack?.(targetId);
  };

  const handleVolumeChange = (event) => {
    const nextValue = Number(event?.target?.value);
    if (!Number.isFinite(nextValue)) return;
    const normalized = Math.min(Math.max(nextValue, 0), 100) / 100;
    if (typeof controls?.setVolume === "function") {
      controls.setVolume(normalized);
    } else if (typeof controls?.setMusicVolume === "function") {
      controls.setMusicVolume(normalized);
    }
  };

  const handleMuteToggle = () => {
    controls?.toggleMute?.();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "themes":
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {themeOptions.map(([key, theme]) => {
              const isActive = key === resolvedThemeKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleThemeSelect(key)}
                  className={`group flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/20 ${
                    isActive
                      ? "border-[var(--theme-primary)] bg-white/15 text-white"
                      : "border-white/10 bg-black/30 text-white/80 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg font-semibold">
                      {theme?.name ?? formatTrackLabel(key)}
                    </span>
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-xs font-semibold uppercase tracking-[0.2em]"
                    >
                      {isActive ? "Active" : "Set"}
                    </span>
                  </div>
                  <div
                    className="h-16 w-full overflow-hidden rounded-xl border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${
                        theme?.bg?.[0] ?? "#111"
                      }, ${theme?.bg?.[1] ?? "#222"})`,
                    }}
                    aria-hidden="true"
                  />
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
                    {Object.entries(theme?.colors ?? {}).map(([label, value]) => (
                      <span
                        key={label}
                        className="flex items-center gap-2"
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: value }}
                          aria-hidden="true"
                        />
                        {label}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        );
      case "avatars":
        return (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-white/70">
              Choose the avatar that represents your vibe. Your selection saves
              instantly so it follows you into every session.
            </p>
            <AvatarSelector
              selectedAvatar={profile?.avatar}
              onAvatarSelect={onAvatarChange}
            />
          </div>
        );
      case "music":
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                Currently Playing
              </span>
              <span className="text-lg font-semibold text-white">
                {formatTrackLabel(normalizedCurrentTrack)}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                Tracks
              </span>
              <div className="flex flex-wrap gap-3">
                {availableTrackIds.map((trackId) => {
                  const isActive = trackId === normalizedCurrentTrack;
                  return (
                    <button
                      key={trackId}
                      type="button"
                      onClick={() => handleTrackSelect(trackId)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/20 ${
                        isActive
                          ? "bg-[var(--theme-primary)] text-black"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {formatTrackLabel(trackId)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <label className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Volume
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volumeValue}
                  onChange={handleVolumeChange}
                  className="accent-[var(--theme-primary)]"
                />
                <div className="flex justify-between text-xs text-white/60">
                  <span>Muted</span>
                  <span>{volumeValue}%</span>
                </div>
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Mute
                </span>
                <button
                  type="button"
                  onClick={handleMuteToggle}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/20 ${
                    isMuted
                      ? "bg-white/20 text-white"
                      : "bg-[var(--theme-primary)] text-black"
                  }`}
                >
                  {isMuted ? "Muted" : "On"}
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      title="Settings"
      open={open}
      onClose={onClose}
      actions={[
        <button
          key="close"
          type="button"
          className="btn grad-pink"
          onClick={() => {
            controls?.playSFX?.("click");
            onClose();
          }}
        >
          Close
        </button>,
      ]}
    >
      <div className="flex flex-col gap-6 text-left">
        <div className="flex flex-wrap justify-center gap-3">
          {TAB_DEFINITIONS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black/20 ${
                  isActive
                    ? "bg-[var(--theme-primary)] text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_18px_36px_rgba(0,0,0,0.35)]">
          {renderTabContent()}
        </div>
      </div>
    </Modal>
  );
}
