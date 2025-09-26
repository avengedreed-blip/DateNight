import React, { useState, memo } from "react";
import Modal from "./Modal.jsx";
import { THEMES } from "../constants/themes.js";

const SettingsModal = memo(({ open, onClose, onThemeChange, profile }) => {
  const [activeTab, setActiveTab] = useState("themes");
  const achievements = profile?.achievements || [];

  return (
    <Modal
      title="Settings"
      open={open}
      onClose={onClose}
      actions={[
        <button key="1" className="btn grad-pink" onClick={onClose}>
          Close
        </button>,
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div
          style={{
            padding: "0.25rem",
            borderRadius: "0.5rem",
            background: "rgba(0,0,0,0.2)",
            display: "flex",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={() => setActiveTab("themes")}
            className={`px-4 py-2 font-bold rounded-lg transition-all duration-200 ${
              activeTab === "themes"
                ? "bg-white/90 text-black shadow-md"
                : "bg-transparent text-white/70 hover:bg-white/10"
            }`}
          >
            Themes
          </button>
          <button
            onClick={() => setActiveTab("achievements")}
            className={`px-4 py-2 font-bold rounded-lg transition-all duration-200 ${
              activeTab === "achievements"
                ? "bg-white/90 text-black shadow-md"
                : "bg-transparent text-white/70 hover:bg-white/10"
            }`}
          >
            Achievements
          </button>
        </div>

        <div className="pt-4">
          {activeTab === "themes" && (
            <div className="animate-in grid grid-cols-2 gap-4">
              {Object.entries(THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => onThemeChange(key)}
                  className="p-4 rounded-xl flex items-center justify-center text-center font-semibold transition-transform hover:scale-105 duration-200"
                  style={{
                    background: `linear-gradient(180deg, ${theme.bg[0]}, ${theme.bg[1]})`,
                    color: "#fff",
                    border: `2px solid ${theme.colors.truth}`,
                  }}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          )}
          {activeTab === "achievements" && (
            <div className="animate-in">
              {achievements.filter((a) => a.unlocked).length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto pr-2">
                  {achievements
                    .filter((a) => a.unlocked)
                    .map((ach) => (
                      <div
                        key={ach.id}
                        className="relative group glass p-4 rounded-xl flex flex-col items-center justify-center text-center aspect-square transition-transform duration-200 hover:scale-105"
                      >
                        <span className="text-4xl mb-2">{ach.icon}</span>
                        <h4 className="font-bold text-sm text-white">{ach.title}</h4>
                        <div className="absolute bottom-full mb-2 w-max max-w-xs p-2 text-xs bg-black/80 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          {ach.description}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-white/60">
                  Play some games to unlock your first achievement!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
});

export default SettingsModal;
