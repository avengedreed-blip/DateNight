import React, { useCallback, useEffect, useRef, useState } from "react";

const focusSelectors =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const Modal = ({ isOpen, onClose, children }) => {
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null);

  const closeWithAnimation = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 220);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWithAnimation();
      }

      if (event.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(focusSelectors);
        if (!focusable.length) {
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeydown);

    window.requestAnimationFrame(() => {
      const focusable = modalRef.current?.querySelectorAll(focusSelectors);
      focusable?.[0]?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [closeWithAnimation, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`modal-backdrop ${isClosing ? "fade-out" : "fade-in"}`}
      onClick={closeWithAnimation}
    >
      <div
        ref={modalRef}
        className={`modal-content ${isClosing ? "slide-out" : "slide-in"}`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
