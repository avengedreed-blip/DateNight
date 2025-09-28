import { useEffect, useMemo, useState } from "react";

// Use the enhanced 3D avatar selector for a more playful experience.
import AvatarSelector from "./AvatarSelector3D";
import Modal from "./modals/Modal";
import { THEMES } from "../themeConfig";

const TAB_DEFINITIONS = [
  { id: "themes", label: "Themes" },
  { id: "avatars", label: "Avatars" },
  { id: "music", label: "Music" },
  { id: "custom", label: "Custom" },
  { id: "achievements", label: "Achievements" },
  // New tab for editing prompts. Allows players to add, edit or remove
  // prompts in different categories and intensities. See renderTabContent
  // for the editor implementation.
  { id: "prompts", label: "Prompts" },
  // Display a simple statistics dashboard summarizing your gameplay.  This
  // tab shows total rounds played, correct answers, refusals and your
  // current streaks.
  { id: "stats", label: "Stats" },
];

const CUSTOM_THEME_STORAGE_KEY = "date-night/custom-theme";
const CUSTOM_THEME_NAME = "Custom";

const getStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch (error) {
    console.warn("localStorage unavailable", error);
    return null;
  }
};

const isHexColor = (value) =>
  typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);

const normalizeTrackId = (trackId) =>
  typeof trackId === "string" ? trackId.replace(/_/g, "-") : trackId;

const denormalizeTrackId = (trackId) =>
  typeof trackId === "string" ? trackId.replace(/-/g, "_") : trackId;

const sanitizeCustomThemeRecord = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  const themeSource = raw.theme ?? raw;
  const bgStart = themeSource?.bg?.[0];
  const bgEnd = themeSource?.bg?.[1];
  const truth = themeSource?.colors?.truth ?? themeSource?.truth;
  const dare = themeSource?.colors?.dare ?? themeSource?.dare;
  const trivia = themeSource?.colors?.trivia ?? themeSource?.trivia;
  const meterStart = themeSource?.meter?.[0] ?? themeSource?.meterStart;
  const meterEnd = themeSource?.meter?.[1] ?? themeSource?.meterEnd;

  if (
    !isHexColor(bgStart) ||
    !isHexColor(bgEnd) ||
    !isHexColor(truth) ||
    !isHexColor(dare) ||
    !isHexColor(trivia) ||
    !isHexColor(meterStart) ||
    !isHexColor(meterEnd)
  ) {
    return null;
  }

  const normalizedTrack = normalizeTrackId(raw.track ?? raw.music ?? null);

  const theme = {
    name: CUSTOM_THEME_NAME,
    bg: [bgStart, bgEnd],
    colors: { truth, dare, trivia },
    meter: [meterStart, meterEnd],
    label: "white",
    particles: {
      type:
        (themeSource?.particles && themeSource.particles.type) || "custom",
      color:
        (themeSource?.particles && themeSource.particles.color &&
          isHexColor(themeSource.particles.color)
          ? themeSource.particles.color
          : truth),
    },
  };

  return {
    theme,
    track: normalizedTrack,
    isActive: raw.isActive !== false,
  };
};

const loadInitialCustomTheme = () => {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(CUSTOM_THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeCustomThemeRecord(parsed);
  } catch (error) {
    console.warn("Failed to parse custom theme from storage", error);
    return null;
  }
};

const persistCustomTheme = (record) => {
  const storage = getStorage();
  if (!storage) return;
  if (!record) {
    storage.removeItem(CUSTOM_THEME_STORAGE_KEY);
    return;
  }
  try {
    storage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(record));
  } catch (error) {
    console.warn("Failed to persist custom theme", error);
  }
};

const INITIAL_CUSTOM_THEME_RECORD = loadInitialCustomTheme();

if (INITIAL_CUSTOM_THEME_RECORD?.theme) {
  THEMES.custom = INITIAL_CUSTOM_THEME_RECORD.theme;
}

const BASE_TRACK_IDS = [
  "classic-dark",
  "romantic-glow",
  "playful-neon",
  "mystic-night",
];

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

const DEFAULT_THEME_FALLBACK = THEMES?.["classic-dark"] ?? {
  bg: ["#0B0F14", "#0E1320"],
  colors: { truth: "#00E6D0", dare: "#FF477E", trivia: "#7AA2FF" },
  meter: ["#00E6D0", "#FF477E"],
};

const buildFormStateFromTheme = (theme = DEFAULT_THEME_FALLBACK) => ({
  bgStart: theme?.bg?.[0] ?? DEFAULT_THEME_FALLBACK.bg[0],
  bgEnd: theme?.bg?.[1] ?? DEFAULT_THEME_FALLBACK.bg[1],
  truth: theme?.colors?.truth ?? DEFAULT_THEME_FALLBACK.colors.truth,
  dare: theme?.colors?.dare ?? DEFAULT_THEME_FALLBACK.colors.dare,
  trivia: theme?.colors?.trivia ?? DEFAULT_THEME_FALLBACK.colors.trivia,
  meterStart: theme?.meter?.[0] ?? DEFAULT_THEME_FALLBACK.meter[0],
  meterEnd: theme?.meter?.[1] ?? DEFAULT_THEME_FALLBACK.meter[1],
});

export default function SettingsModal({
  open,
  onClose,
  profile,
  onAvatarChange = () => {},
  onThemeChange = () => {},
  themeKey,
  audio,
  music,
  // Optional prompt editor API. When provided this object must include
  // functions and data for managing prompts (e.g. prompts, customPrompts,
  // addCustomPrompt, removeCustomPrompt, updateCustomPrompts). See
  // App.jsx for usage.
  promptEditor = null,
  // Optional stats object provided by useAchievements. If present, this
  // contains totals and current streaks for completed rounds, correct
  // answers and refusals.  It is consumed in the Stats tab.
  achievementStats = null,
}) {
  const [activeTab, setActiveTab] = useState(TAB_DEFINITIONS[0].id);

  const controls = music ?? audio ?? {};
  const controlState = controls?.state ?? {};

  const resolvedThemeKey = themeKey ?? profile?.themeId ?? "classic-dark";
  const rawCurrentTrackId = extractTrackId(controlState.track);
  const normalizedCurrentTrack =
    normalizeTrackId(rawCurrentTrackId) ?? BASE_TRACK_IDS[0];

  const [customThemeRecord, setCustomThemeRecord] = useState(
    () => INITIAL_CUSTOM_THEME_RECORD
  );

  const [customFormState, setCustomFormState] = useState(() => {
    const baseTheme =
      INITIAL_CUSTOM_THEME_RECORD?.theme ??
      THEMES[resolvedThemeKey] ??
      DEFAULT_THEME_FALLBACK;
    return buildFormStateFromTheme(baseTheme);
  });

  const [customTrack, setCustomTrack] = useState(() => {
    if (INITIAL_CUSTOM_THEME_RECORD?.track) {
      return INITIAL_CUSTOM_THEME_RECORD.track;
    }
    const extracted = normalizeTrackId(extractTrackId(controlState.track));
    return extracted ?? BASE_TRACK_IDS[0];
  });

  // State for the prompt editor tab. promptCategory tracks which category is
  // currently selected (truth, dare, trivia, consequence). promptIntensity
  // tracks the selected intensity for categories that support it. newPromptText
  // holds the text for a new prompt being added. editId/editText are used
  // when editing an existing custom prompt.
  const [promptCategory, setPromptCategory] = useState('truth');
  const [promptIntensity, setPromptIntensity] = useState('normal');
  const [newPromptText, setNewPromptText] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (customThemeRecord?.theme) {
      THEMES.custom = customThemeRecord.theme;
      const nextForm = buildFormStateFromTheme(customThemeRecord.theme);
      setCustomFormState((prev) => {
        const keys = Object.keys(nextForm);
        const isSame = keys.every((key) => prev?.[key] === nextForm[key]);
        return isSame ? prev : nextForm;
      });
      setCustomTrack((prev) =>
        customThemeRecord.track && customThemeRecord.track !== prev
          ? customThemeRecord.track
          : prev
      );
    } else if (Object.prototype.hasOwnProperty.call(THEMES, "custom")) {
      delete THEMES.custom;
    }
  }, [customThemeRecord]);

  useEffect(() => {
    if (
      customThemeRecord?.isActive &&
      customThemeRecord?.theme &&
      resolvedThemeKey !== "custom"
    ) {
      onThemeChange("custom");
    }
  }, [customThemeRecord?.isActive, customThemeRecord?.theme, resolvedThemeKey, onThemeChange]);

  const themeOptions = Object.entries(THEMES ?? {});

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
    if (customThemeRecord?.track) {
      ids.add(normalizeTrackId(customThemeRecord.track));
    }
    if (customTrack) {
      ids.add(normalizeTrackId(customTrack));
    }

    return Array.from(ids);
  }, [controlState, controls, customThemeRecord?.track, customTrack]);

  useEffect(() => {
    if (!availableTrackIds.length) {
      return;
    }
    if (!customTrack || !availableTrackIds.includes(customTrack)) {
      const fallback = availableTrackIds.includes(normalizedCurrentTrack)
        ? normalizedCurrentTrack
        : availableTrackIds[0];
      setCustomTrack(fallback);
    }
  }, [availableTrackIds, customTrack, normalizedCurrentTrack]);

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

  const handleCustomFieldChange = (field) => (event) => {
    const nextValue = event?.target?.value;
    if (typeof nextValue !== "string") return;
    setCustomFormState((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleCustomTrackChange = (event) => {
    const nextValue = normalizeTrackId(event?.target?.value);
    if (!nextValue) return;
    setCustomTrack(nextValue);
  };

  const isCustomThemeValid = useMemo(() => {
    if (!customFormState) return false;
    const { bgStart, bgEnd, truth, dare, trivia, meterStart, meterEnd } =
      customFormState;
    return [bgStart, bgEnd, truth, dare, trivia, meterStart, meterEnd].every(
      isHexColor
    );
  }, [customFormState]);

  const handleCustomThemeSave = () => {
    if (!isCustomThemeValid) return;

    const theme = {
      name: CUSTOM_THEME_NAME,
      bg: [customFormState.bgStart, customFormState.bgEnd],
      colors: {
        truth: customFormState.truth,
        dare: customFormState.dare,
        trivia: customFormState.trivia,
      },
      meter: [customFormState.meterStart, customFormState.meterEnd],
      label: "white",
      particles: {
        type: "custom",
        color: customFormState.truth,
      },
    };

    const selectedTrack =
      normalizeTrackId(customTrack) ?? normalizedCurrentTrack ?? BASE_TRACK_IDS[0];

    const record = {
      theme,
      track: selectedTrack,
      isActive: true,
    };

    // Persist the custom theme and update the in-memory THEMES registry.
    // Without updating the exported THEMES object the newly saved custom
    // colors would not take effect until the page is reloaded. Assigning
    // to THEMES.custom here makes the custom theme immediately available.
    persistCustomTheme(record);
    setCustomThemeRecord(record);
    THEMES.custom = theme;

    onThemeChange("custom");

    const denormalized = denormalizeTrackId(selectedTrack);
    if (denormalized && denormalized !== rawCurrentTrackId) {
      controls?.playTrack?.(denormalized);
    }

    setActiveTab("themes");
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
      case "achievements":
        return (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {(profile?.achievements ?? []).map((ach) => (
              <div
                key={ach.id}
                className={`glass p-4 rounded-lg flex flex-col items-center text-center relative ${
                  !ach.unlocked ? "opacity-50" : ""
                }`}
              >
                <div className="text-3xl mb-2">{ach.icon}</div>
                <h3 className="font-bold text-lg">{ach.title}</h3>
                <p className="text-sm opacity-80">{ach.description}</p>
                {!ach.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-60">
                    🔒
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      case "stats":
        return (
          <div className="flex flex-col gap-4 mt-4">
            {achievementStats ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Rounds Played</span>
                  <span className="text-lg font-bold text-white">{achievementStats.rounds}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Correct Answers</span>
                  <span className="text-lg font-bold text-white">{achievementStats.correctCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Refusals / Incorrect</span>
                  <span className="text-lg font-bold text-white">{achievementStats.refusalCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Current Correct Streak</span>
                  <span className="text-lg font-bold text-white">{achievementStats.correctStreak}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Current Refusal Streak</span>
                  <span className="text-lg font-bold text-white">{achievementStats.refusalStreak}</span>
                </div>
              </>
            ) : (
              <p className="text-white/70 text-sm">No statistics available.</p>
            )}
          </div>
        );
      case "custom":
        return (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-white/70">
              Craft your own vibe with bespoke colors and a soundtrack. Save it
              to instantly apply it across the experience.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { field: "bgStart", label: "Background Gradient Start" },
                { field: "bgEnd", label: "Background Gradient End" },
                { field: "truth", label: "Truth Color" },
                { field: "dare", label: "Dare Color" },
                { field: "trivia", label: "Trivia Color" },
                { field: "meterStart", label: "Meter Start" },
                { field: "meterEnd", label: "Meter End" },
              ].map(({ field, label }) => (
                <label key={field} className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    {label}
                  </span>
                  <input
                    type="color"
                    value={customFormState?.[field] ?? "#000000"}
                    onChange={handleCustomFieldChange(field)}
                    className="h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/10 p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/20"
                  />
                  <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                    {customFormState?.[field] ?? "#000000"}
                  </span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Music Track
                </span>
                <select
                  value={customTrack}
                  onChange={handleCustomTrackChange}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/20"
                >
                  {availableTrackIds.map((trackId) => (
                    <option key={trackId} value={trackId}>
                      {formatTrackLabel(trackId)}
                    </option>
                  ))}
                </select>
                <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                  {formatTrackLabel(customTrack)}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Preview
                </span>
                <div
                  className="h-24 w-full rounded-2xl border border-white/10"
                  style={{
                    background: `linear-gradient(135deg, ${
                      customFormState?.bgStart ?? "#000000"
                    }, ${customFormState?.bgEnd ?? "#111111"})`,
                  }}
                  aria-hidden="true"
                />
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
                  {[
                    { label: "Truth", color: customFormState?.truth },
                    { label: "Dare", color: customFormState?.dare },
                    { label: "Trivia", color: customFormState?.trivia },
                    { label: "Meter A", color: customFormState?.meterStart },
                    { label: "Meter B", color: customFormState?.meterEnd },
                  ].map(({ label, color }) => (
                    <span key={label} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: color ?? "#000000" }}
                        aria-hidden="true"
                      />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCustomThemeSave}
              disabled={!isCustomThemeValid}
              className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/20 ${
                isCustomThemeValid
                  ? "bg-[var(--theme-primary)] text-black hover:bg-[var(--theme-primary)]/90"
                  : "cursor-not-allowed bg-white/10 text-white/40"
              }`}
            >
              Save Custom Theme
            </button>
          </div>
        );
      case "prompts": {
        // Prompt editor UI. Relies on promptEditor prop passed to SettingsModal.
        const editor = promptEditor;
        if (!editor || !Array.isArray(editor.prompts)) {
          return (
            <div className="text-center text-sm text-white/70">
              Prompt editor not available.
            </div>
          );
        }
        const { prompts: mergedPrompts = [], customPrompts = [], addCustomPrompt, removeCustomPrompt, updateCustomPrompts } = editor;
        // Combine default (merged) prompts with custom prompts. We'll treat all
        // prompts the same for display purposes but only allow editing/removal
        // of custom prompts. Default prompts have ids starting with "default:".
        const allPrompts = mergedPrompts;
        // Filter prompts by selected category and intensity (if applicable).
        const filtered = allPrompts.filter((p) => {
          if (!p || p.category !== promptCategory) return false;
          if (promptCategory === 'trivia') return true;
          // For truth, dare and consequence we match the selected intensity
          return (p.intensity ?? 'normal') === promptIntensity;
        });

        // Helper to determine if a prompt is custom (editable/removable).
        const isCustomPrompt = (p) => {
          return p && typeof p.id === 'string' && !p.id.startsWith('default:');
        };

        // Handler for adding a new custom prompt.
        const handleAddPrompt = () => {
          const text = (newPromptText || '').trim();
          if (!text) return;
          // Generate a unique id. Use timestamp plus random suffix to avoid collisions.
          const timestamp = Date.now();
          const rand = Math.floor(Math.random() * 100000);
          const intensity = promptCategory === 'trivia' ? null : promptIntensity;
          const newId = `custom:${promptCategory}:${intensity ?? 'default'}:${timestamp}-${rand}`;
          if (typeof addCustomPrompt === 'function') {
            addCustomPrompt({ id: newId, category: promptCategory, intensity, text });
          }
          setNewPromptText('');
        };

        // Handler for starting an edit on a custom prompt.
        const startEdit = (prompt) => {
          setEditId(prompt.id);
          setEditText(prompt.text);
          // Ensure category/intensity selectors reflect the item being edited
          setPromptCategory(prompt.category);
          setPromptIntensity(prompt.intensity ?? 'normal');
        };

        // Handler to save edits to a custom prompt.
        const handleSaveEdit = () => {
          if (!editId) return;
          const updatedText = (editText || '').trim();
          if (!updatedText) return;
          if (typeof updateCustomPrompts === 'function') {
            const updatedList = customPrompts.map((p) => {
              if (p.id === editId) {
                return { ...p, text: updatedText };
              }
              return p;
            });
            updateCustomPrompts(updatedList);
          }
          setEditId(null);
          setEditText('');
        };

        // Handler to cancel editing.
        const handleCancelEdit = () => {
          setEditId(null);
          setEditText('');
        };

        return (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-white/70">
              Customize the pool of prompts used in the game. Select a category and
              intensity (for Truth, Dare and Consequence), then add, edit or remove
              prompts. Custom prompts are saved locally per player and mixed with
              the built‑in prompts.
            </p>
            <div className="flex gap-2 flex-wrap">
              {['truth','dare','trivia','consequence'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setPromptCategory(cat);
                    // Reset intensity when switching categories
                    setPromptIntensity('normal');
                    setEditId(null);
                    setEditText('');
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/20 ${promptCategory === cat ? 'bg-[var(--theme-primary)] text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            {promptCategory !== 'trivia' && (
              <div className="flex gap-2 flex-wrap">
                {['normal','spicy','extreme'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      setPromptIntensity(level);
                      setEditId(null);
                      setEditText('');
                    }}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/20 ${promptIntensity === level ? 'bg-[var(--theme-primary)] text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-2">
              {filtered.map((prompt) => (
                <div key={prompt.id} className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
                  {editId === prompt.id ? (
                    <div className="flex-1 flex flex-col gap-1">
                      <textarea
                        className="w-full p-2 rounded-md bg-black/30 text-white text-sm"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-3 py-1 text-xs rounded-md bg-green-500 text-white hover:bg-green-600"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-xs rounded-md bg-gray-600 text-white hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="flex-1 text-sm text-white/90">
                      {prompt.text}
                    </span>
                  )}
                  <div className="flex-shrink-0 flex gap-2">
                    {isCustomPrompt(prompt) && editId !== prompt.id && (
                      <button
                        type="button"
                        onClick={() => startEdit(prompt)}
                        className="px-2 py-1 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600"
                      >
                        Edit
                      </button>
                    )}
                    {isCustomPrompt(prompt) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof removeCustomPrompt === 'function') {
                            removeCustomPrompt(prompt.id);
                          }
                        }}
                        className="px-2 py-1 text-xs rounded-md bg-red-500 text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center text-sm text-white/50 py-4">No prompts available for this selection.</div>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <textarea
                className="w-full p-2 rounded-md bg-black/30 text-white text-sm"
                placeholder="Enter a new prompt..."
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddPrompt}
                className="self-start px-4 py-2 text-sm font-semibold rounded-md bg-[var(--theme-primary)] text-black hover:bg-[var(--theme-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newPromptText.trim()}
              >
                Add Prompt
              </button>
            </div>
          </div>
        );
      }
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
        <div className="flex gap-3 justify-center mb-4">
          {TAB_DEFINITIONS.map(({ id: tab, label }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`btn ${activeTab === tab ? "grad-neon" : "grad-pink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_18px_36px_rgba(0,0,0,0.35)]">
          {renderTabContent()}
        </div>
      </div>
    </Modal>
  );
}
