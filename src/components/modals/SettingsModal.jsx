import React from "react";
import Modal from "./Modal.jsx";
import { MusicIcon, PencilIcon, SoundIcon } from "../icons/Icons.jsx";

const SettingsModal = ({
  isOpen,
  onClose,
  musicVolume = 0,
  onMusicVolumeChange,
  sfxVolume = 0,
  onSfxVolumeChange,
  isSfxActive = false,
  onOpenEditor,
  debugAnalyticsEnabled = false,
  onToggleDebugAnalytics,
  analyticsEvents = [],
}) => {
  const handleMusicVolumeInput = (event) => {
    const value = Number.parseFloat(event.target.value);
    onMusicVolumeChange?.(Number.isFinite(value) ? value : musicVolume);
  };

  const handleSfxVolumeInput = (event) => {
    const value = Number.parseFloat(event.target.value);
    onSfxVolumeChange?.(Number.isFinite(value) ? value : sfxVolume);
  };

  const handleDebugToggle = (event) => {
    const nextValue = event.target.checked;
    onToggleDebugAnalytics?.(nextValue);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return "—";
    }

    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(timestamp));
    } catch (error) {
      return new Date(timestamp).toLocaleTimeString();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="settings-modal-title">
      <h2 id="settings-modal-title" className="mb-6 text-2xl font-semibold text-slate-100">
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
          <div className={`settings-row ${isSfxActive ? "settings-row--active" : ""}`}>
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

        <section className="settings-group" aria-labelledby="settings-debug">
          <h3 id="settings-debug" className="settings-group__title">
            Debug Tools
          </h3>
          <label className="settings-row gap-3" style={{ alignItems: "center" }}>
            <input
              type="checkbox"
              className="settings-toggle"
              checked={debugAnalyticsEnabled}
              onChange={handleDebugToggle}
            />
            <span className="text-sm text-slate-200">Enable Debug Analytics Log</span>
          </label>
          {debugAnalyticsEnabled ? (
            <div
              className="analytics-debug-log mt-4"
              style={{
                maxHeight: "220px",
                overflowY: "auto",
                borderRadius: "0.75rem",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                background: "rgba(15, 23, 42, 0.55)",
                padding: "0.75rem",
                fontFamily:
                  "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace)",
                fontSize: "0.75rem",
                lineHeight: 1.4,
                color: "var(--log-text, #e2e8f0)",
              }}
            >
              {analyticsEvents.length === 0 ? (
                <p className="text-slate-300 text-xs">
                  Analytics events will appear here as you play.
                </p>
              ) : (
                (() => {
                  const reversed = analyticsEvents.slice().reverse();
                  return reversed.map((event, index) => {
                    const key = event.id ?? `${event.type}-${event.timestamp}-${index}`;
                    const isLast = index === reversed.length - 1;
                    const payload = event.payload ?? event.data ?? {};
                    return (
                      <div
                        key={key}
                        className="analytics-debug-log__item"
                        style={{
                          borderBottom: isLast
                            ? "none"
                            : "1px solid rgba(148, 163, 184, 0.2)",
                          paddingBottom: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div className="flex items-center justify-between gap-4 text-slate-400">
                          <span>{formatTimestamp(event.timestamp)}</span>
                          <span className="font-semibold text-slate-200">{event.type}</span>
                        </div>
                        <pre
                          style={{
                            marginTop: "0.25rem",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {JSON.stringify(payload, null, 2)}
                        </pre>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          ) : null}
        </section>
      </div>
    </Modal>
  );
};

export default SettingsModal;
