import React from "react";
import Modal from "./Modal.jsx";
import ModalParticles from "./ModalParticles.jsx";

const ConsequenceModal = ({
  isOpen,
  onClose,
  consequence,
  onButtonClick: handleButtonClick,
}) => {
  const titleId = "consequence-modal-title";
  const bodyId = "consequence-modal-body";
  const { text = "", intensity = "normal" } = consequence ?? {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={bodyId}
    >
      <div className="consequence-card">
        <ModalParticles
          category="consequence"
          intensity={intensity}
          isActive={isOpen}
        />
        <div className="consequence-card__content">
          <h2 id={titleId} className="consequence-card__title">
            Consequence
          </h2>
          <p id={bodyId} className="consequence-card__body">
            {text}
          </p>
          <div className="consequence-card__actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                handleButtonClick?.();
                onClose?.();
              }}
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConsequenceModal;
