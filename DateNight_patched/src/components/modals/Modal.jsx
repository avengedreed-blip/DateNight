import { memo, useRef, useEffect, useState } from "react";

const Modal = memo((props) => {
  // Support both the modern isOpen/buttons props and legacy open/actions props.
  // This allows existing components (like SettingsModal) to continue
  // functioning without modification while using the updated API.
  const {
    title,
    isOpen,
    open,
    onClose,
    buttons,
    actions,
    children,
    timeoutMs = null,
    onTimeout = null,
  } = props;

  // Determine which open prop to use. Prefer isOpen if provided, else fall
  // back to open. This enables backwards compatibility.
  const actualIsOpen = typeof isOpen !== 'undefined' ? isOpen : open;

  // Determine which set of buttons/actions to render. Use the modern
  // `buttons` array if available; otherwise fall back to `actions`.
  const buttonDefinitions = buttons ?? actions ?? [];
  const modalRef = useRef(null);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // State to track remaining time for countdown (milliseconds). Only used if timeoutMs is provided.
  const [remainingTime, setRemainingTime] = useState(() => (typeof timeoutMs === 'number' ? timeoutMs : null));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (actualIsOpen) {
      modalRef.current?.focus();
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!actualIsOpen) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => setIsAnimatingOut(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Setup a countdown timer if timeoutMs is specified and modal is open. Calls onTimeout when expired.
  useEffect(() => {
    if (!actualIsOpen || typeof timeoutMs !== 'number' || timeoutMs <= 0) {
      setRemainingTime(null);
      return undefined;
    }
    setRemainingTime(timeoutMs);
    const start = Date.now();
    const updateInterval = 250;
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(timeoutMs - elapsed, 0);
      setRemainingTime(remaining);
    }, updateInterval);
    const timeoutId = setTimeout(() => {
      setRemainingTime(0);
      if (typeof onTimeout === 'function') {
        onTimeout();
      }
    }, timeoutMs);
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [actualIsOpen, timeoutMs, onTimeout]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!actualIsOpen && !isAnimatingOut) return null;

  const animationClass = actualIsOpen && !isAnimatingOut ? "animate-in" : "animate-out";

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
        {/* Countdown timer indicator (top right) */}
        {typeof timeoutMs === 'number' && timeoutMs > 0 && remainingTime != null && (
          <div className="modal-timer absolute top-2 right-4 text-xl font-bold">
            {Math.ceil(remainingTime / 1000)}s
          </div>
        )}
        <h2 id="modal-title" className="text-3xl font-bold mb-4 text-[var(--label-color)]">
          {title}
        </h2>
        <div className="text-[var(--label-color)]/80 text-lg max-h-[50vh] overflow-y-auto pr-2">
          {children}
        </div>
        {buttonDefinitions?.length > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            {buttonDefinitions.map((btn, index) => (
              <button
                key={index}
                onClick={btn.onClick}
                className={`modal-btn ${btn.style || ""}`.trim()}
                style={{ '--glow-color': btn.themeColor || 'var(--default-glow)' }}
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
