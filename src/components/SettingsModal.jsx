import React, { useState, useEffect, useCallback, memo } from "react";
import { doc, updateDoc } from "firebase/firestore";
import Modal from "./Modal.jsx";
import AvatarSelector, {
  PRESET_AVATARS,
  LOCAL_STORAGE_KEY as AVATAR_STORAGE_KEY,
} from "./AvatarSelector.jsx";
import { db } from "../config/firebase.js";
import { THEMES } from "../theme/themes.js";

const LEGACY_AVATAR_STORAGE_KEY = "avatar";

const readInitialAvatar = (profile) => {
  if (profile?.avatar) {
    return profile.avatar;
  }

  if (typeof window === "undefined") {
    return PRESET_AVATARS[0];
  }

  try {
    return (
      window.localStorage.getItem(AVATAR_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_AVATAR_STORAGE_KEY) ||
      PRESET_AVATARS[0]
    );
  } catch (error) {
    console.error("Failed to read stored avatar:", error);
    return PRESET_AVATARS[0];
  }
};

const persistAvatarLocally = (avatarPath) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(AVATAR_STORAGE_KEY, avatarPath);
    if (window.localStorage.getItem(LEGACY_AVATAR_STORAGE_KEY)) {
      window.localStorage.removeItem(LEGACY_AVATAR_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to persist avatar locally:", error);
  }
};

const SettingsModal = memo(({ open, onClose, onThemeChange, profile }) => {
  const [activeTab, setActiveTab] = useState("themes");
  const [selectedAvatar, setSelectedAvatar] = useState(() =>
    readInitialAvatar(profile)
  );
  const achievements = profile?.achievements || [];

  useEffect(() => {
    if (!profile?.avatar) {
      return;
    }

    setSelectedAvatar((prev) =>
      prev === profile.avatar ? prev : profile.avatar
    );
    persistAvatarLocally(profile.avatar);
  }, [profile?.avatar]);

  const profileUid = profile?.uid;

  const onAvatarChange = useCallback(
    async (avatarPath) => {
      if (!avatarPath || avatarPath === selectedAvatar) {
        return;
      }

      setSelectedAvatar(avatarPath);
      persistAvatarLocally(avatarPath);

      if (!profileUid) {
        return;
      }

      if (!db) {
        console.warn(
          "Firestore is not initialized. Avatar change persisted locally only."
        );
        return;
      }

      try {
        await updateDoc(doc(db, "users", profileUid), {
          avatar: avatarPath,
        });
      } catch (error) {
        console.error("Failed to update avatar in Firestore:", error);
      }
    },
    [profileUid, selectedAvatar]
  );

  return (
    <Modal
      title="Settings"
      open={open}
      onClose={onClose}
      actions={[
        <button key="close" className="btn grad-pink" onClick={onClose}>
          Close
        </button>,
      ]}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          maxHeight: "65vh",
          overflowY: "auto",
          paddingRight: "0.5rem",
        }}
      >
        <AvatarSelector
          selectedAvatar={selectedAvatar}
          onAvatarSelect={onAvatarChange}
        />
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
              {(Array.isArray(THEMES)
                ? THEMES.map((theme) => [theme.id, theme])
                : Object.entries(THEMES)
              ).map(([key, theme]) => {
                const truthColor =
                  theme?.colors?.truth ??
                  (Array.isArray(theme?.colors) ? theme.colors[0] : undefined) ??
                  "#ffffff";
                return (
                  <button
                    key={key}
                    onClick={() => onThemeChange(key)}
                    className="p-4 rounded-xl flex items-center justify-center text-center font-semibold transition-transform hover:scale-105 duration-200"
                    style={{
                      background: `linear-gradient(180deg, ${theme.bg[0]}, ${theme.bg[1]})`,
                      color: "#fff",
                      border: `2px solid ${truthColor}`,
                    }}
                  >
                    {theme.name}
                  </button>
                );
              })}
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
