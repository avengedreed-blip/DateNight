import React, { useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import { MusicIcon, PencilIcon, SoundIcon } from "../icons/Icons.jsx";

const DEFAULT_CUSTOM_THEME = {
  name: "",
  trackId: "",
  backgroundPrimary: "#0f172a",
  backgroundSecondary: "#1e293b",
  backgroundStyle: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  accentColor: "#8b5cf6",
  wheelTruthColor: "#38bdf8",
  wheelDareColor: "#a855f7",
  wheelTriviaColor: "#f472b6",
  wheelLabelColor: "#0f172a",
};

const createSyncBackground = (primary, secondary) =>
  `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;

const normalizeNumber = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const SettingsModal = ({
  isOpen,
  onClose,
  musicVolume,
  onMusicVolumeChange,
  sfxVolume,
  onSfxVolumeChange,
  isSfxActive,
  onOpenEditor,
  themes = [],
  activeThemeId,
  onSelectTheme,
  onCreateCustomTheme,
  onDeleteCustomTheme,
}) => {
  const [builderState, setBuilderState] = useState(DEFAULT_CUSTOM_THEME);
  const [backgroundDirty, setBackgroundDirty] = useState(false);

  const themeGroups = useMemo(() => {
    const baseThemes = [];
    const customThemes = [];

    (themes ?? []).forEach((theme) => {
      if (theme?.isBaseTheme) {
        baseThemes.push(theme);
        return;
      }
      customThemes.push(theme);
    });

    return { baseThemes, customThemes };
  }, [themes]);

  const handleBuilderInput = (key, value) => {
    setBuilderState((current) => {
      const next = { ...current, [key]: value };
      if (!backgroundDirty && (key === "backgroundPrimary" || key === "backgroundSecondary")) {
        const primary = key === "backgroundPrimary" ? value : next.backgroundPrimary;
        const secondary = key === "backgroundSecondary" ? value : next.backgroundSecondary;
        next.backgroundStyle = createSyncBackground(primary, secondary);
      }
      return next;
    });
  };

  const handleBackgroundStyleChange = (value) => {
    setBackgroundDirty(true);
    handleBuilderInput("backgroundStyle", value);
  };

  const handleResetBackgroundStyle = () => {
    setBackgroundDirty(false);
    setBuilderState((current) => ({
      ...current,
      backgroundStyle: createSyncBackground(
        current.backgroundPrimary,
        current.backgroundSecondary
      ),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (typeof onCreateCustomTheme !== "function") {
      return;
    }

    const themePayload = {
      name: builderState.name,
      trackId: builderState.trackId,
      backgroundStyle: builderState.backgroundStyle,
      backgroundPrimary: builderState.backgroundPrimary,
      backgroundSecondary: builderState.backgroundSecondary,
      accentColor: builderState.accentColor,
      wheelTruthColor: builderState.wheelTruthColor,
      wheelDareColor: builderState.wheelDareColor,
      wheelTriviaColor: builderState.wheelTriviaColor,
      wheelLabelColor: builderState.wheelLabelColor,
    };

    onCreateCustomTheme(themePayload);
    setBuilderState((current) => ({
      ...current,
      name: "",
      trackId: "",
    }));
    setBackgroundDirty(false);
  };

  const handleMusicVolumeInput = (event) => {
    const value = normalizeNumber(event.target.value, musicVolume);
    if (typeof onMusicVolumeChange === "function") {
      onMusicVolumeChange(value);
    }
  };

  const handleSfxVolumeInput = (event) => {
    const value = normalizeNumber(event.target.value, sfxVolume);
    if (typeof onSfxVolumeChange === "function") {
      onSfxVolumeChange(value);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="settings-modal-title">
      <h2
        id="settings-modal-title"
        className="mb-6 text-2xl font-semibold text-slate-100"
      >
        Settings
      </h2>
      <div className="settings-section">
        <section className="settings-group" aria-labelledby="settings-audio">
          <h3 id="settings-audio" className="settings-group__title">
            Audio
          </h3>
          <div className="settings-row">
            <MusicIcon />
            <input
              className="settings-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={handleMusicVolumeInput}
            />
          </div>
          <div
            className={`settings-row ${isSfxActive ? "settings-row--active" : ""}`}
          >
            <SoundIcon />
            <input
              className="settings-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={handleSfxVolumeInput}
            />
          </div>
          <button
            type="button"
            className="primary-button flex items-center justify-center gap-2"
            onClick={onOpenEditor}
          >
            <PencilIcon /> Edit Prompts
          </button>
        </section>

        <section className="settings-group" aria-labelledby="settings-theme">
          <h3 id="settings-theme" className="settings-group__title">
            Theme Presets
          </h3>
          <div className="theme-picker" role="list">
            {themeGroups.baseThemes.map((theme) => {
              const isActive = theme.id === activeThemeId;
              const previewStyle = {
                background: theme.cssVars?.["--background-gradient"],
              };
              const trackLabel = theme.trackId || "—";

              return (
                <div
                  key={theme.id}
                  className="theme-picker__item"
                  role="listitem"
                >
                  <button
                    type="button"
                    className={`theme-card ${isActive ? "theme-card--active" : ""}`}
                    onClick={() => onSelectTheme?.(theme.id)}
                    style={previewStyle}
                    aria-pressed={isActive}
                  >
                    <span className="theme-card__content">
                      <span
                        className="theme-card-label theme-card-label--name"
                        title={theme.name}
                      >
                        {theme.name}
                      </span>
                      <span
                        className="theme-card-label theme-card-label--track"
                        title={`Track ID: ${trackLabel}`}
                      >
                        Track ID:
                        <span className="theme-card-label__value">
                          {trackLabel}
                        </span>
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="settings-group" aria-labelledby="settings-custom-themes">
          <h3 id="settings-custom-themes" className="settings-group__title">
            Custom Themes
          </h3>
          {themeGroups.customThemes.length > 0 && (
            <div className="theme-picker theme-picker--custom" role="list">
              {themeGroups.customThemes.map((theme) => {
                const isActive = theme.id === activeThemeId;
                const previewStyle = {
                  background: theme.cssVars?.["--background-gradient"],
                };
                const trackLabel = theme.trackId || "—";
                return (
                  <div key={theme.id} className="theme-picker__item" role="listitem">
                    <button
                      type="button"
                      className={`theme-card ${isActive ? "theme-card--active" : ""}`}
                      onClick={() => onSelectTheme?.(theme.id)}
                      style={previewStyle}
                      aria-pressed={isActive}
                    >
                      <span className="theme-card__content">
                        <span
                          className="theme-card-label theme-card-label--name"
                          title={theme.name}
                        >
                          {theme.name}
                        </span>
                        <span
                          className="theme-card-label theme-card-label--track"
                          title={`Track ID: ${trackLabel}`}
                        >
                          Track ID:
                          <span className="theme-card-label__value">
                            {trackLabel}
                          </span>
                        </span>
                      </span>
                    </button>
                    {typeof onDeleteCustomTheme === "function" && (
                      <button
                        type="button"
                        className="theme-card__delete"
                        onClick={() => onDeleteCustomTheme(theme.id)}
                        aria-label={`Remove ${theme.name}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <form className="custom-theme-builder" onSubmit={handleSubmit}>
            <div className="custom-theme-grid">
              <label className="custom-theme-field">
                <span>Theme Name</span>
                <input
                  type="text"
                  value={builderState.name}
                  onChange={(event) => handleBuilderInput("name", event.target.value)}
                  placeholder="Romantic Sunset"
                  className="custom-theme-input"
                />
              </label>
              <label className="custom-theme-field">
                <span>Track ID</span>
                <input
                  type="text"
                  value={builderState.trackId}
                  onChange={(event) => handleBuilderInput("trackId", event.target.value)}
                  placeholder="myCustomTrack"
                  className="custom-theme-input"
                />
              </label>
              <label className="custom-theme-field">
                <span>Background Start</span>
                <input
                  type="color"
                  value={builderState.backgroundPrimary}
                  onChange={(event) => handleBuilderInput("backgroundPrimary", event.target.value)}
                  className="custom-theme-input custom-theme-input--color"
                />
              </label>
              <label className="custom-theme-field">
                <span>Background End</span>
                <input
                  type="color"
                  value={builderState.backgroundSecondary}
                  onChange={(event) => handleBuilderInput("backgroundSecondary", event.target.value)}
                  className="custom-theme-input custom-theme-input--color"
                />
              </label>
              <label className="custom-theme-field custom-theme-field--wide">
                <span>Background Style / Texture</span>
                <input
                  type="text"
                  value={builderState.backgroundStyle}
                  onChange={(event) => handleBackgroundStyleChange(event.target.value)}
                  placeholder="linear-gradient(135deg, #000, #222)"
                  className="custom-theme-input"
                />
                <button
                  type="button"
                  className="custom-theme-sync"
                  onClick={handleResetBackgroundStyle}
                >
                  Sync gradient from colors
                </button>
              </label>
              <label className="custom-theme-field">
                <span>Accent Color</span>
                <input
                  type="color"
                  value={builderState.accentColor}
                  onChange={(event) => handleBuilderInput("accentColor", event.target.value)}
                  className="custom-theme-input custom-theme-input--color"
                />
              </label>
              <label className="custom-theme-field">
                <span>Truth Slice</span>
                <input
                  type="color"
                  value={builderState.wheelTruthColor}
                  onChange={(event) =>
                    handleBuilderInput("wheelTruthColor", event.target.value)
                  }
                  className="custom-theme-input custom-theme-input--color"
                />
              </label>
              <label className="custom-theme-field">
                <span>Dare Slice</span>
                <input
                  type="color"
                  value={builderState.wheelDareColor}
                  onChange={(event) =>
                    handleBuilderInput("wheelDareColor", event.target.value)
                  }
                  className="custom-theme-input custom-theme-input--color"
                />
              </label>
              <label className="custom-theme-field">
                <span>Trivia Slice</span>
                <input
                  type="color"
                  value={builderState.wheelTriviaColor}
                  onChange={(event) =>
                    handleBuilderInput("wheelTriviaColor", event.target.value)
                  }
                  className="custom-theme-input custom-theme-input--color"
                />
              </label>
              <label className="custom-theme-field">
                <span>Label Color</span>
                <input
                  type="color"
                  value={builderState.wheelLabelColor}
                  onChange={(event) =>
                    handleBuilderInput("wheelLabelColor", event.target.value)
                  }
                  className="custom-theme-input custom-theme-input--color"
                />
              </label>
            </div>
            <button type="submit" className="custom-theme-submit">
              Save Custom Theme
            </button>
          </form>
        </section>
      </div>
    </Modal>
  );
};

export default SettingsModal;
