import React from 'react';

const ConsequenceModal = ({ isOpen, onClose, content }) => {
  if (!isOpen) return null;

  return (
    <div className="glass-modal fixed inset-0 flex items-center justify-center p-6">
      <div className="bg-black/80 text-white rounded-3xl p-6 max-w-md w-full space-y-4">
        <h2 className="text-3xl font-bold text-yellow-300">Consequence</h2>
        <p className="text-base text-white/85 leading-relaxed">{content}</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
        >
          Accept Fate
        </button>
      </div>
    </div>
  );
};

export default ConsequenceModal;
