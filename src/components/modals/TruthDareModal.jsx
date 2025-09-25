import React from 'react';

const TruthDareModal = ({ isOpen, onClose, content }) => {
  if (!isOpen) return null;

  return (
    <div className="glass-modal fixed inset-0 flex items-center justify-center p-6">
      <div className="bg-black/80 text-white rounded-3xl p-6 max-w-md w-full space-y-4">
        <h2 className="text-3xl font-bold text-pink-400">Truth or Dare</h2>
        <p className="text-base text-white/85 leading-relaxed">{content}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-400 text-white font-semibold"
          >
            Completed!
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-full bg-red-500 hover:bg-red-400 text-white font-semibold"
          >
            Refuse
          </button>
        </div>
      </div>
    </div>
  );
};

export default TruthDareModal;
