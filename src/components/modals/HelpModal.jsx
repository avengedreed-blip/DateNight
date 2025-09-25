import React from 'react';

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="glass-modal fixed inset-0 flex items-center justify-center p-6">
      <div className="bg-black/70 text-white rounded-2xl p-6 max-w-md w-full space-y-4">
        <h2 className="text-2xl font-bold">How to Play</h2>
        <p className="text-sm text-white/80">
          Spin the wheel, follow the prompt, and keep the energy high! Track your streaks and watch the extreme meter climb.
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-400 text-white font-semibold"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default HelpModal;
