import React from "react";

import Modal from "./Modal";
import useMusic, { MUSIC_TRACK_OPTIONS } from "../hooks/useMusic";

export default function SettingsModal({ open, onClose }) {
  const { currentTrackId, setVolume, volume, isMuted, toggleMute, playTrack } =
    useMusic();

  const handleVolumeChange = (event) => {
    const nextValue = Number(event.target.value);
    if (Number.isNaN(nextValue)) {
      return;
    }
    setVolume(nextValue / 100);
  };

  const handleTrackChange = (event) => {
    playTrack(event.target.value);
  };

  return (
    <Modal
      title="Settings"
      open={open}
      onClose={onClose}
      actions={[
        <button key="close" type="button" className="btn grad-pink" onClick={onClose}>
          Close
        </button>,
      ]}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          textAlign: "left",
        }}
      >
        <section>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Audio</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>Volume</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(volume * 100)}
                onChange={handleVolumeChange}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={isMuted}
                onChange={toggleMute}
              />
              <span style={{ fontWeight: 600 }}>Mute</span>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>Music Track</span>
              <select value={currentTrackId} onChange={handleTrackChange}>
                {MUSIC_TRACK_OPTIONS.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <section>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Avatar</h3>
          <p style={{ opacity: 0.8 }}>Avatar picker (coming soon)</p>
        </section>
      </div>
    </Modal>
  );
}
