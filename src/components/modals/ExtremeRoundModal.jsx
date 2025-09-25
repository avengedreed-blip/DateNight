import React from 'react';

const ExtremeRoundModal = ({ isOpen, onClose, content }) => {
  if (!isOpen) return null;

  return (
    <div className="glass-modal fixed inset-0 flex items-center justify-center p-6">
      <div className="bg-black/85 text-white rounded-3xl p-8 max-w-lg w-full space-y-5 border border-pink-500/50 shadow-[0_0_25px_rgba(255,71,126,0.6)]">
        <h2 className="text-4xl font-black text-pink-400 drop-shadow">Extreme Round!</h2>
        <p className="text-base text-white/85 leading-relaxed">{content}</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-3 rounded-full bg-pink-600 hover:bg-pink-500 text-white font-semibold text-lg"
        >
          Bring it on
        </button>
      </div>
    </div>
  );
};

export default ExtremeRoundModal;
