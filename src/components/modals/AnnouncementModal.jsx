import React from "react";
import Modal from "./Modal.jsx";

const AnnouncementModal = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <div className="announcement-card">
      <h2 className="announcement-card__title">Extreme Round</h2>
      <p className="announcement-card__body">
        Buckle up! For this spin the stakes are higher, the prompts are wilder,
        and bragging rights are on the line.
      </p>
      <div className="announcement-card__actions">
        <button type="button" className="primary-button" onClick={onClose}>
          Let's Go
        </button>
      </div>
    </div>
  </Modal>
);

export default AnnouncementModal;
