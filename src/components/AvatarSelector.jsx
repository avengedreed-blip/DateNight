import React, { useEffect, useMemo, useRef, useState } from "react";

const LOCAL_STORAGE_KEY = "selectedAvatar";
const LEGACY_STORAGE_KEY = "avatar";

const PRESET_AVATARS = [
  { id: "aurora", src: "/avatars/avatar_1.svg", label: "Aurora Glow" },
  { id: "ember", src: "/avatars/avatar_2.svg", label: "Crimson Ember" },
  { id: "lumen", src: "/avatars/avatar_3.svg", label: "Lumen Pulse" },
  { id: "nebula", src: "/avatars/avatar_4.svg", label: "Nebula Drift" },
  { id: "nova", src: "/avatars/avatar_5.svg", label: "Nova Spark" },
  { id: "serene", src: "/avatars/avatar_6.svg", label: "Serene Bloom" },
  { id: "zenith", src: "/avatars/avatar_7.svg", label: "Zenith Crest" },
  { id: "prism", src: "/avatars/avatar_8.svg", label: "Prism Burst" },
];

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

const writeStoredAvatar = (avatarPath) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, avatarPath);
    if (window.localStorage.getItem(LEGACY_STORAGE_KEY)) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to persist avatar selection", error);
  }
};

const AvatarSelector = ({ selectedAvatar, onAvatarSelect }) => {
  const fallbackAvatar = PRESET_AVATARS[0]?.src;
  const [currentAvatar, setCurrentAvatar] = useState(() => {
    return selectedAvatar || readStoredAvatar() || fallbackAvatar;
  });
  const hasHydratedFromStorage = useRef(false);

  useEffect(() => {
    if (selectedAvatar && selectedAvatar !== currentAvatar) {
      setCurrentAvatar(selectedAvatar);
    }
  }, [selectedAvatar, currentAvatar]);

  useEffect(() => {
    if (hasHydratedFromStorage.current) {
      return;
    }

    hasHydratedFromStorage.current = true;

    if (selectedAvatar) {
      // Parent controls the value, so we don't override it here.
      return;
    }

    const storedAvatar = readStoredAvatar();
    if (storedAvatar && storedAvatar !== currentAvatar) {
      setCurrentAvatar(storedAvatar);
      onAvatarSelect?.(storedAvatar, { silent: true });
    }
  }, [currentAvatar, onAvatarSelect, selectedAvatar]);

  useEffect(() => {
    if (!currentAvatar) {
      return;
    }

    writeStoredAvatar(currentAvatar);
  }, [currentAvatar]);

  const presetAvatars = useMemo(() => PRESET_AVATARS, []);

  const handleSelect = (avatarPath) => {
    if (!avatarPath || avatarPath === currentAvatar) {
      return;
    }

    setCurrentAvatar(avatarPath);
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
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_22px_color-mix(in_srgb,var(--theme-primary)_65%,transparent)]" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {presetAvatars.map((avatar) => {
          const isSelected = avatar.src === currentAvatar;

          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => handleSelect(avatar.src)}
              aria-pressed={isSelected}
              className={`group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-black/35 transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] ${
                isSelected
                  ? "scale-105 ring-4 ring-[var(--theme-primary)] shadow-[0_0_18px_rgba(0,0,0,0.4)]"
                  : "hover:scale-105 ring-1 ring-white/25 hover:ring-white/60"
              }`}
            >
              <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <img
                src={avatar.src}
                alt={avatar.label}
                className="relative z-10 h-14 w-14 rounded-full object-cover"
                draggable={false}
              />
              <span className="sr-only">{avatar.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AvatarSelector;
export { PRESET_AVATARS, LOCAL_STORAGE_KEY };
