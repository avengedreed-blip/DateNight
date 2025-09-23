import React from "react";
import Modal from "./Modal.jsx";
import ModalParticles from "./ModalParticles.jsx";

const PromptModal = ({
  isOpen,
  onClose,
  prompt,
  onRefuse,
  onButtonClick: handleButtonClick,
  onAccept,
  roundTimer = 30,
  timerActive = false,
}) => {
  const titleId = "prompt-modal-title";
  const bodyId = "prompt-modal-body";
  const isTrivia = prompt.type === "trivia";
  const timeLeft = Math.max(roundTimer, 0);
  const timerStateClass = (() => {
    if (!timerActive) {
      return "prompt-timer";
    }

    if (timeLeft <= 5) {
      return "prompt-timer prompt-timer--critical";
    }

    if (timeLeft <= 15) {
      return "prompt-timer prompt-timer--warning";
    }

    return "prompt-timer prompt-timer--safe";
  })();
  const handleRefuse = () => {
    handleButtonClick?.();
    onRefuse?.();
  };
  const handleAccept = () => {
    handleButtonClick?.();
    (onAccept ?? onClose)?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={bodyId}
    >
      <div className="prompt-card">
        <ModalParticles
          category={prompt.type}
          intensity={prompt.intensity}
          isActive={isOpen}
        />
        <div className="prompt-card__content">
          {timerActive ? (
            <div className={timerStateClass} aria-live="polite">
              <span className="prompt-timer__icon" aria-hidden="true">
                ⏱️
              </span>{" "}
              {timeLeft}s
            </div>
          ) : null}
          <h2 id={titleId} className="prompt-card__title">
            {prompt.title}
          </h2>
          <p id={bodyId} className="prompt-card__body">
            {prompt.text}
          </p>
          <div className="prompt-card__actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleRefuse}
            >
              {isTrivia ? "Incorrect" : "Refuse"}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleAccept}
            >
              {isTrivia ? "Correct" : "Accept"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PromptModal;
