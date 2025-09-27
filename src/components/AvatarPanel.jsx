import React, { useMemo } from "react";

import { AvatarGlyph, PRESET_AVATARS } from "./AvatarSelector";

const AvatarPanel = ({ selectedAvatar, onSelect, avatars = PRESET_AVATARS }) => {
  const fallbackAvatar = avatars[0]?.id;
  const displayAvatar = useMemo(() => {
    if (!selectedAvatar) {
      return fallbackAvatar;
    }

    return avatars.find((avatar) => avatar.id === selectedAvatar)?.id ?? fallbackAvatar;
  }, [avatars, fallbackAvatar, selectedAvatar]);

  const buttons = useMemo(
    () =>
      avatars.map((avatar) => {
        const isSelected = displayAvatar
          ? displayAvatar === avatar.id
          : avatar.id === fallbackAvatar;

        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect?.(avatar.id)}
            className={`group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/40 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              isSelected
                ? "scale-105 ring-2 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.75)]"
                : "ring-1 ring-white/20 hover:ring-white/60 hover:shadow-[0_0_12px_rgba(255,255,255,0.45)]"
            }`}
          >
            <span className="absolute inset-0 rounded-full bg-white/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
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
      }),
    [avatars, displayAvatar, fallbackAvatar, onSelect]
  );

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
          Current Avatar
        </span>
        <div className="relative">
          <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-blue-400 bg-black/40 shadow-[0_0_30px_rgba(59,130,246,0.55)]">
            <AvatarGlyph
              id={displayAvatar}
              label="Selected avatar"
              className="h-full w-full"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_25px_rgba(59,130,246,0.65)]" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">{buttons}</div>
    </div>
  );
};

export default AvatarPanel;
export { PRESET_AVATARS };
