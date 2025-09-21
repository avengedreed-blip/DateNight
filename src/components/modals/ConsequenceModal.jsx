import React from "react";
import Modal from "./Modal.jsx";

const ConsequenceModal = ({ isOpen, onClose, text }) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <div className="consequence-card">
      <h2 className="consequence-card__title">Consequence</h2>
      <p className="consequence-card__body">{text}</p>
      <div className="consequence-card__actions">
        <button type="button" className="primary-button" onClick={onClose}>
          I Understand
        </button>
      </div>
    </div>
  </Modal>
);

export default ConsequenceModal;
