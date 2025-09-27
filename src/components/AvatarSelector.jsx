import { useEffect, useState } from "react";
import "../assets/avatars.svg";

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

export default function AvatarSelector({ selectedAvatar, onAvatarSelect }) {
  const [current, setCurrent] = useState(
    selectedAvatar || localStorage.getItem("selectedAvatar") || AVATAR_IDS[0]
  );

  useEffect(() => {
    localStorage.setItem("selectedAvatar", current);
    onAvatarSelect?.(current);
  }, [current, onAvatarSelect]);

  return (
    <div className="avatar-grid">
      {AVATAR_IDS.map((id) => (
        <button
          key={id}
          className={`avatar-btn ${current === id ? "selected" : ""}`}
          onClick={() => setCurrent(id)}
        >
          <svg viewBox="0 0 200 200" className="avatar-icon">
            <use href={`#${id}`} />
          </svg>
        </button>
      ))}
    </div>
  );
}
