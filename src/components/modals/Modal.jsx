import { memo, useRef, useEffect } from "react";

const Modal = memo(({ title, isOpen, onClose, buttons, children }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex="-1"
    >
      <div ref={modalRef} className="modal-card animate-in">
        <h2 id="modal-title" className="modal-title">
          {title}
        </h2>
        <div className="modal-content">{children}</div>
        {buttons?.length > 0 && (
          <div className="modal-actions">
            {buttons.map((btn, index) => (
              <button
                key={index}
                onClick={btn.onClick}
                className={`modal-btn ${btn.style}`}
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
