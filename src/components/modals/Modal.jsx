import React, { memo, useRef, useEffect } from 'react';

const Modal = memo(({ title, isOpen, onClose, buttons, children }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the modal when it opens for accessibility
      modalRef.current?.focus();
    }
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex="-1"
    >
      <div
        ref={modalRef}
        className="glass-modal w-full max-w-md p-6 rounded-3xl shadow-2xl text-center backdrop-blur-xl border border-white/20"
      >
        <h2 id="modal-title" className="text-2xl font-bold mb-4 text-theme-text">{title}</h2>
        <div className="text-theme-text/80 text-lg">
          {children}
        </div>
        {buttons && buttons.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            {buttons.map((btn, index) => (
              <button
                key={index}
                onClick={btn.onClick}
                className={`w-full sm:w-auto px-6 py-3 rounded-lg font-bold text-lg transition-transform duration-100 transform hover:scale-105 active:scale-95 ${btn.style}`}
                data-sound={btn.sound}
                data-haptic={btn.haptic}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default Modal;
