import React from "react";
import Modal from "./Modal.jsx";

const ConsequenceModal = ({ isOpen, onClose, text }) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <div className="border-2 border-pink-500/80 p-6 rounded-xl relative">
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-pink-500 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider text-white">
        Consequence
      </div>
      <h2 className="text-3xl font-bold text-pink-400 mb-4 mt-4 text-shadow">
        Oh No!
      </h2>
      <p className="text-[var(--text-secondary)] mb-8 text-lg">{text}</p>
      <button
        onClick={onClose}
        className="modal-button bg-pink-500/80 hover:bg-pink-500 border-transparent"
      >
        I Understand
      </button>
    </div>
  </Modal>
);

export default ConsequenceModal;
