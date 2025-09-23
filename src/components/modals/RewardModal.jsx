import React from "react";
import Modal from "./Modal.jsx";

const badgeThemes = {
  Bronze: {
    emoji: "🥉",
    accent: "from-amber-500/30 to-amber-300/20",
  },
  Silver: {
    emoji: "🥈",
    accent: "from-slate-200/40 to-slate-100/10",
  },
  Gold: {
    emoji: "🥇",
    accent: "from-yellow-400/50 to-orange-300/20",
  },
  Legendary: {
    emoji: "🏆",
    accent: "from-violet-400/60 to-fuchsia-400/25",
  },
};

const RewardModal = ({
  isOpen,
  onClose,
  onButtonClick: handleButtonClick,
  reward,
}) => {
  if (!reward) {
    return null;
  }

  const { threshold, badge, streak } = reward;
  const titleId = "reward-modal-title";
  const bodyId = "reward-modal-body";
  const badgeTheme = badgeThemes[badge] ?? badgeThemes.Bronze;

  const handleCelebrate = () => {
    handleButtonClick?.();
    onClose?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy={titleId} describedBy={bodyId}>
      <div className={`reward-card bg-gradient-to-br ${badgeTheme.accent}`}>
        <div className="reward-card__icon" aria-hidden="true">
          {badgeTheme.emoji}
        </div>
        <h2 id={titleId} className="reward-card__title">
          {badge} Streak Unlocked!
        </h2>
        <p id={bodyId} className="reward-card__body">
          You have accepted {streak} in a row. Keep the momentum going to chase the
          next badge tier!
        </p>
        <div className="reward-card__meta" aria-live="polite">
          <span>Threshold reached: {threshold}</span>
        </div>
        <div className="reward-card__actions">
          <button type="button" className="primary-button" onClick={handleCelebrate}>
            Keep Playing
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RewardModal;
