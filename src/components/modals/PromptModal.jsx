import React from "react";
import Modal from "./Modal.jsx";

const PromptModal = ({ isOpen, onClose, prompt, onRefuse }) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <div className="prompt-card">
      <h2 className="prompt-card__title">{prompt.title}</h2>
      <p className="prompt-card__body">{prompt.text}</p>
      <div className="prompt-card__actions">
        <button type="button" className="secondary-button" onClick={onRefuse}>
          Refuse
        </button>
        <button type="button" className="primary-button" onClick={onClose}>
          Accept
        </button>
      </div>
    </div>
  </Modal>
);

export default PromptModal;
