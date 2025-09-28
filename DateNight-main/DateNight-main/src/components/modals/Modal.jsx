import { memo, useRef, useEffect, useState } from "react";

const Modal = memo(({ title, isOpen, onClose, buttons, children }) => {
  const modalRef = useRef(null);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      modalRef.current?.focus();
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => setIsAnimatingOut(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen && !isAnimatingOut) return null;

  const animationClass = isOpen && !isAnimatingOut ? "animate-in" : "animate-out";

  return (
    <div
      className={`modal-overlay ${animationClass}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className={`modal-content ${animationClass}`}
        tabIndex="-1"
      >
        <h2 id="modal-title" className="text-3xl font-bold mb-4 text-[var(--label-color)]">
          {title}
        </h2>
        <div className="text-[var(--label-color)]/80 text-lg max-h-[50vh] overflow-y-auto pr-2">
          {children}
        </div>
        {buttons?.length > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            {buttons.map((btn, index) => (
              <button
                key={index}
                onClick={btn.onClick}
                className={`modal-btn ${btn.style || ""}`}
                style={{ "--glow-color": btn.themeColor || "var(--default-glow)" }}
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
