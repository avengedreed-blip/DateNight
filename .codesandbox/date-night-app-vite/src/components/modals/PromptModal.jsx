import React from "react";
import Modal from "./Modal.jsx";

const PromptModal = ({ isOpen, onClose, prompt, onRefuse }) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <h2 className="text-3xl font-bold text-shadow mb-4 tracking-tight">
      {prompt.title}
    </h2>
    <p className="text-[var(--text-secondary)] mb-8 min-h-[60px] text-lg">
      {prompt.text}
    </p>
    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
      <button
        onClick={onRefuse}
        className="modal-button bg-black/20 hover:bg-black/40 border-white/20"
      >
        Refuse
      </button>
      <button
        onClick={onClose}
        className="modal-button bg-[var(--primary-accent)]/80 hover:bg-[var(--primary-accent)] border-transparent"
      >
        Accept
      </button>
    </div>
  </Modal>
);

export default PromptModal;
