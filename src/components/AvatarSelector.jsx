import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import avatarsSpriteUrl from "../assets/avatars.svg?url";

const LOCAL_STORAGE_KEY = "selectedAvatar";
const LEGACY_STORAGE_KEY = "avatar";

const PRESET_AVATARS = [
  { id: "avatar-bolt", label: "Neon Bolt" },
  { id: "avatar-heart", label: "Pulse Heart" },
  { id: "avatar-controller", label: "Arcade Spark" },
  { id: "avatar-star", label: "Nova Star" },
  { id: "avatar-note", label: "Melody Drop" },
  { id: "avatar-rocket", label: "Rocket Rush" },
  { id: "avatar-diamond", label: "Crystal Prism" },
  { id: "avatar-mask", label: "Mystic Mask" },
];

const LEGACY_AVATAR_MAP = (() => {
  const map = new Map();

  PRESET_AVATARS.forEach((avatar, index) => {
    const legacyIndex = index + 1;
    map.set(`/avatars/avatar_${legacyIndex}.svg`, avatar.id);
    map.set(`/avatars/avatar_${legacyIndex}.png`, avatar.id);
  });

  return map;
})();

const isValidAvatarId = (value) =>
  PRESET_AVATARS.some((avatar) => avatar.id === value);

const resolveAvatarId = (value) => {
  if (!value) {
    return null;
  }

  if (isValidAvatarId(value)) {
    return value;
  }

  return LEGACY_AVATAR_MAP.get(value) ?? null;
};

const readStoredAvatar = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue =
      window.localStorage.getItem(LOCAL_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY);

    return resolveAvatarId(storedValue);
  } catch (error) {
    console.error("Failed to read avatar from localStorage", error);
    return null;
  }
};

const writeStoredAvatar = (avatarId) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, avatarId);
    if (window.localStorage.getItem(LEGACY_STORAGE_KEY)) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to persist avatar selection", error);
  }
};

const AvatarGlyph = React.memo(function AvatarGlyph({
  id,
  label,
  className,
  ariaHidden = false,
}) {
  if (!id) {
    return null;
  }

  const symbolHref = `${avatarsSpriteUrl}#${id}`;
  const accessibilityProps = ariaHidden
    ? { "aria-hidden": true, role: "presentation" }
    : { role: "img", "aria-label": label };

  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      {...accessibilityProps}
    >
      <use href={symbolHref} />
    </svg>
  );
});

const AvatarSelector = ({
  selectedAvatar,
  onAvatarSelect,
  avatars = PRESET_AVATARS,
}) => {
  const availableAvatars = useMemo(() => avatars, [avatars]);
  const fallbackAvatar = availableAvatars[0]?.id;

  const normalizeAvatarId = useCallback(
    (value) => {
      if (!value) {
        return null;
      }

      if (availableAvatars.some((avatar) => avatar.id === value)) {
        return value;
      }

      const legacyResolved = resolveAvatarId(value);
      if (
        legacyResolved &&
        availableAvatars.some((avatar) => avatar.id === legacyResolved)
      ) {
        return legacyResolved;
      }

      return null;
    },
    [availableAvatars]
  );

  const [currentAvatar, setCurrentAvatar] = useState(() => {
    return (
      normalizeAvatarId(selectedAvatar) ||
      normalizeAvatarId(readStoredAvatar()) ||
      fallbackAvatar
    );
  });
  const hasHydratedFromStorage = useRef(false);

  useEffect(() => {
    const resolvedAvatar = normalizeAvatarId(selectedAvatar);

    if (resolvedAvatar && resolvedAvatar !== currentAvatar) {
      setCurrentAvatar(resolvedAvatar);
    }
  }, [selectedAvatar, currentAvatar, normalizeAvatarId]);

  useEffect(() => {
    if (hasHydratedFromStorage.current) {
      return;
    }

    hasHydratedFromStorage.current = true;

    if (selectedAvatar) {
      // Parent controls the value, so we don't override it here.
      return;
    }

    const storedAvatar = normalizeAvatarId(readStoredAvatar());
    if (storedAvatar && storedAvatar !== currentAvatar) {
      setCurrentAvatar(storedAvatar);
      onAvatarSelect?.(storedAvatar, { silent: true });
    }
  }, [currentAvatar, normalizeAvatarId, onAvatarSelect, selectedAvatar]);

  useEffect(() => {
    if (!currentAvatar) {
      return;
    }

    writeStoredAvatar(currentAvatar);
  }, [currentAvatar]);

  const presetAvatars = useMemo(() => availableAvatars, [availableAvatars]);

  const handleSelect = (avatarId) => {
    if (!avatarId || avatarId === currentAvatar) {
      return;
    }

    setCurrentAvatar(avatarId);
    onAvatarSelect?.(avatarId);
  };

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
          Your Avatar
        </span>
        <div className="relative">
          <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[var(--theme-primary)] bg-black/40 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
            <AvatarGlyph
              id={currentAvatar}
              label="Selected avatar"
              className="h-full w-full"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_22px_color-mix(in_srgb,var(--theme-primary)_65%,transparent)]" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {presetAvatars.map((avatar) => {
          const isSelected = avatar.id === currentAvatar;

          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => handleSelect(avatar.id)}
              aria-pressed={isSelected}
              className={`group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-black/35 transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] ${
                isSelected
                  ? "scale-105 ring-4 ring-[var(--theme-primary)] shadow-[0_0_18px_rgba(0,0,0,0.4)]"
                  : "hover:scale-105 ring-1 ring-white/25 hover:ring-white/60"
              }`}
            >
              <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full">
                <AvatarGlyph
                  id={avatar.id}
                  label={avatar.label}
                  ariaHidden
                  className="h-14 w-14"
                />
              </div>
              <span className="sr-only">{avatar.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AvatarSelector;
export { PRESET_AVATARS, LOCAL_STORAGE_KEY, AvatarGlyph };
