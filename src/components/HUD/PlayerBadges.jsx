import React from "react";

const BADGE_LABELS = {
  HOT_STREAK_3: "Hot Streak (3)",
  HOT_STREAK_5: "Hot Streak (5)",
  HOT_STREAK_10: "Hot Streak (10)",
  TRIVIA_ACE_3: "Trivia Ace (3)",
  TRIVIA_ACE_5: "Trivia Ace (5)",
  COWARD_PENALTY: "Coward Penalty",
};

const getBadgeLabel = (badge) => BADGE_LABELS[badge] ?? badge;

const PlayerBadges = ({ badges = [] }) => {
  if (!Array.isArray(badges) || badges.length === 0) {
    return null;
  }

  return (
    <div className="player-badges" aria-live="polite" aria-label="Player badges">
      {badges.map((badge) => {
        const label = getBadgeLabel(badge);
        const toneClass = badge === "COWARD_PENALTY" ? " player-badge-chip--warning" : "";
        const highlightClass = badge.startsWith("HOT_STREAK")
          ? " player-badge-chip--highlight"
          : badge.startsWith("TRIVIA_ACE")
          ? " player-badge-chip--accent"
          : "";
        return (
          <span
            key={badge}
            className={`player-badge-chip${toneClass}${highlightClass}`}
            title={label}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
};

export default PlayerBadges;
