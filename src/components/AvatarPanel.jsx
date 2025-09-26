import React, { useMemo } from "react";

const PRESET_AVATARS = Array.from({ length: 8 }, (_, index) =>
  `/avatars/avatar_${index + 1}.png`
);

const AvatarPanel = ({ selectedAvatar, onSelect }) => {
  const avatars = PRESET_AVATARS;

  const fallbackAvatar = avatars[0];
  const displayAvatar = selectedAvatar || fallbackAvatar;

  const buttons = useMemo(
    () =>
      avatars.map((avatarPath) => {
        const isSelected = selectedAvatar
          ? selectedAvatar === avatarPath
          : avatarPath === fallbackAvatar;

        return (
          <button
            key={avatarPath}
            type="button"
            onClick={() => onSelect?.(avatarPath)}
            className={`group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/40 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              isSelected
                ? "scale-105 ring-2 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.75)]"
                : "ring-1 ring-white/20 hover:ring-white/60 hover:shadow-[0_0_12px_rgba(255,255,255,0.45)]"
            }`}
          >
            <span className="absolute inset-0 rounded-full bg-white/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <img
              src={avatarPath}
              alt="Preset avatar"
              className="relative z-10 h-14 w-14 rounded-full object-cover"
              draggable={false}
            />
          </button>
        );
      }),
    [avatars, fallbackAvatar, onSelect, selectedAvatar]
  );

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
          Current Avatar
        </span>
        <div className="relative">
          <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-blue-400 bg-black/40 shadow-[0_0_30px_rgba(59,130,246,0.55)]">
            <img
              src={displayAvatar}
              alt="Selected avatar"
              className="h-full w-full object-cover"
              draggable={false}
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
