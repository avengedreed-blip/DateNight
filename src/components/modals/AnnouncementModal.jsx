import React from "react";
import Modal from "./Modal.jsx";

const AnnouncementModal = ({
  isOpen,
  onClose,
  onButtonClick: handleButtonClick,
  onConfirm,
}) => {
  const titleId = "announcement-modal-title";
  const bodyId = "announcement-modal-body";
  const handleConfirm = () => {
    handleButtonClick?.();
    (onConfirm ?? onClose)?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={bodyId}
    >
      <div className="announcement-card">
        <h2 id={titleId} className="announcement-card__title">
          Extreme Round
        </h2>
        <p id={bodyId} className="announcement-card__body">
        Buckle up! For this spin the stakes are higher, the prompts are wilder,
        and bragging rights are on the line.
        </p>
        <div className="announcement-card__actions">
          <button type="button" className="primary-button" onClick={handleConfirm}>
            Let's Go
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AnnouncementModal;
