import React, { useMemo, useState, useEffect } from "react";

import ThemesPanel from "./components/ThemesPanel";
import MusicPanel from "./components/MusicPanel";
import AvatarSelector from "./components/AvatarSelector";
import Modal from "./Modal";

const TAB_DEFINITIONS = [
  { id: "themes", label: "Themes" },
  { id: "audio", label: "Audio" },
  { id: "avatars", label: "Avatars" },
  { id: "achievements", label: "Achievements" },
];

export default function SettingsModal({
  open,
  onClose,
  profile,
  onAvatarChange = () => {},
  onThemeChange = () => {},
  themeKey,
  audio,
}) {
  const [activeTab, setActiveTab] = useState(TAB_DEFINITIONS[0].id);

  useEffect(() => {
    if (open) {
      setActiveTab(TAB_DEFINITIONS[0].id);
    }
  }, [open]);

  const achievements = useMemo(() => profile?.achievements ?? [], [profile]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "themes":
        return (
          <ThemesPanel onThemeChange={onThemeChange} themeKey={themeKey} />
        );
      case "audio":
        return <MusicPanel audio={audio} />;
      case "avatars":
        return (
          <div className="flex flex-col gap-6">
            <AvatarSelector
              selectedAvatar={profile?.avatar}
              onAvatarSelect={onAvatarChange}
            />
          </div>
        );
      case "achievements":
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {achievements.length === 0 && (
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-center text-white/70">
                No achievements yet. Keep playing to unlock more!
              </div>
            )}
            {achievements.map((achievement) => {
              const isUnlocked = Boolean(achievement?.unlocked);
              return (
                <div
                  key={achievement?.id ?? achievement?.title}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 transition-colors ${
                    isUnlocked
                      ? "border-[var(--theme-primary)] bg-white/10"
                      : "border-white/10 bg-black/30 text-white/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl" aria-hidden="true">
                      {achievement?.icon ?? "✨"}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
                        {isUnlocked ? "Unlocked" : "Locked"}
                      </span>
                      <span className="text-lg font-semibold text-white">
                        {achievement?.title ?? "Unknown Achievement"}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/80">
                    {achievement?.description ?? "Play more to reveal this achievement."}
                  </p>
                </div>
              );
            })}
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
            audio?.sfx?.play?.("click");
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
