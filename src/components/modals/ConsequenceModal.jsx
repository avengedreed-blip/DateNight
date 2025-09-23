import React from "react";
import Modal from "./Modal.jsx";

const ConsequenceModal = ({
  isOpen,
  onClose,
  text,
  onButtonClick: handleButtonClick,
}) => {
  const titleId = "consequence-modal-title";
  const bodyId = "consequence-modal-body";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={bodyId}
    >
      <div className="consequence-card">
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
    </Modal>
  );
};

export default ConsequenceModal;
