import React, { useEffect, useState } from "react";

const LOCAL_STORAGE_KEY = "selectedAvatar";
const LEGACY_STORAGE_KEY = "avatar";

const PRESET_AVATARS = Array.from({ length: 8 }, (_, index) =>
  `/avatars/avatar_${index + 1}.png`
);

const readStoredAvatar = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return (
      window.localStorage.getItem(LOCAL_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY)
    );
  } catch (error) {
    console.error("Failed to read avatar from localStorage", error);
    return null;
  }
};

const persistAvatar = (avatarPath) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, avatarPath);
    if (window.localStorage.getItem(LEGACY_STORAGE_KEY)) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to save avatar to localStorage", error);
  }
};

const AvatarSelector = ({ selectedAvatar, onAvatarSelect }) => {
  const fallbackAvatar = PRESET_AVATARS[0];
  const [currentAvatar, setCurrentAvatar] = useState(() => {
    return selectedAvatar || readStoredAvatar() || fallbackAvatar;
  });

  useEffect(() => {
    const stored = readStoredAvatar();
    if (stored) {
      setCurrentAvatar((prev) => (prev === stored ? prev : stored));
      onAvatarSelect?.(stored);
    } else if (selectedAvatar) {
      persistAvatar(selectedAvatar);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedAvatar) {
      return;
    }

    setCurrentAvatar((prev) => {
      if (prev === selectedAvatar) {
        return prev;
      }

      persistAvatar(selectedAvatar);
      return selectedAvatar;
    });
  }, [selectedAvatar]);

  const handleSelect = (avatarPath) => {
    if (avatarPath === currentAvatar) {
      return;
    }

    setCurrentAvatar(avatarPath);
    persistAvatar(avatarPath);
    onAvatarSelect?.(avatarPath);
  };

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
          Your Avatar
        </span>
        <div className="relative">
          <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[var(--theme-primary)] bg-black/40 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
            <img
              src={currentAvatar}
              alt="Selected avatar"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_25px_color-mix(in_srgb,var(--theme-primary)_60%,transparent)]" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {PRESET_AVATARS.map((avatarPath) => {
          const isSelected = avatarPath === currentAvatar;

          return (
            <button
              key={avatarPath}
              type="button"
              onClick={() => handleSelect(avatarPath)}
              aria-pressed={isSelected}
              className={`group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-black/35 transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] ${
                isSelected
                  ? "scale-105 ring-4 ring-[var(--theme-primary)] shadow-[0_0_18px_rgba(0,0,0,0.4)]"
                  : "hover:scale-105 ring-1 ring-white/25 hover:ring-white/60"
              }`}
            >
              <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <img
                src={avatarPath}
                alt="Preset avatar"
                className="relative z-10 h-14 w-14 rounded-full object-cover"
                draggable={false}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AvatarSelector;
export { PRESET_AVATARS };
