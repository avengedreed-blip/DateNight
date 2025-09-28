import { useEffect, useState } from "react";
// Import the inline SVG definitions so <use> references resolve correctly.
import "../assets/avatars.svg";

/**
 * A simple avatar selector that renders the existing SVG avatars with a faux 3D
 * effect using CSS transforms and drop shadows. The component preserves
 * the original API of AvatarSelector (selectedAvatar and onAvatarSelect), but
 * enhances the visual presentation by adding depth and subtle interaction
 * animations. This solution avoids the need for external 3D libraries while
 * still feeling playful and on‑theme.
 */
const AVATAR_IDS = [
  "avatar-bolt",
  "avatar-heart",
  "avatar-controller",
  "avatar-star",
  "avatar-note",
  "avatar-rocket",
  "avatar-diamond",
  "avatar-mask",
];

export default function AvatarSelector3D({ selectedAvatar, onAvatarSelect }) {
  // Persist the current avatar selection across sessions via localStorage.
  const [current, setCurrent] = useState(
    selectedAvatar ||
      typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem("selectedAvatar") || AVATAR_IDS[0]
        : AVATAR_IDS[0]
  );

  // When the selection changes, update localStorage and notify parent.
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("selectedAvatar", current);
    }
    onAvatarSelect?.(current);
  }, [current, onAvatarSelect]);

  return (
    <div className="avatar-grid">
      {AVATAR_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={`avatar-btn3d ${current === id ? "selected" : ""}`}
          onClick={() => setCurrent(id)}
        >
          {/*
            We rely on CSS variables (set via themes) for colors. The drop shadow
            and rotation create a sense of depth without WebGL. Using a single
            <svg> element keeps DOM overhead low.
          */}
          <svg viewBox="0 0 200 200" className="avatar-icon-3d">
            <use href={`#${id}`} />
          </svg>
        </button>
      ))}
    </div>
  );
}