import React from "react";
import Modal from "./Modal.jsx";

const PromptModal = ({
  isOpen,
  onClose,
  prompt,
  onRefuse,
  onButtonClick: handleButtonClick,
  onAccept,
}) => {
  const titleId = "prompt-modal-title";
  const bodyId = "prompt-modal-body";
  const isTrivia = prompt.type === "trivia";
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
        <h2 id={titleId} className="prompt-card__title">
          {prompt.title}
        </h2>
        <p id={bodyId} className="prompt-card__body">
          {prompt.text}
        </p>
        <div className="prompt-card__actions">
          <button type="button" className="secondary-button" onClick={handleRefuse}>
            {isTrivia ? "Incorrect" : "Refuse"}
          </button>
          <button type="button" className="primary-button" onClick={handleAccept}>
            {isTrivia ? "Correct" : "Accept"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PromptModal;
