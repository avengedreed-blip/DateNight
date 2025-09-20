import React from "react";
import Modal from "./Modal.jsx";

const AnnouncementModal = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <div className="border-2 border-yellow-400/80 p-6 rounded-xl relative">
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-yellow-400 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider text-yellow-900">
        Extreme Round
      </div>
      <h2 className="text-3xl font-bold text-yellow-300 mb-4 mt-4 text-shadow">
        Get Ready!
      </h2>
      <p className="text-[var(--text-secondary)] mb-8 text-lg">
        This is an EXTREME round. The stakes are higher!
      </p>
      <button
        onClick={onClose}
        className="modal-button bg-yellow-400/80 hover:bg-yellow-400 text-yellow-900 border-transparent"
      >
        Let's Go!
      </button>
    </div>
  </Modal>
);

export default AnnouncementModal;
