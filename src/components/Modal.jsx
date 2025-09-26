import React, { memo, useEffect, useRef, useState } from "react";

const Modal = memo(({ title, open, onClose, children, actions }) => {
  const [isEntering, setIsEntering] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsEntering(true), 50);
      contentRef.current?.focus({ preventScroll: true });
      return () => clearTimeout(timer);
    } else {
      setIsEntering(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,.45)",
        zIndex: 50,
        opacity: isEntering ? 1 : 0,
        transition: "opacity 0.2s ease",
      }}
    >
      <div
        className={`glass modal-content ${isEntering ? "enter" : ""}`}
        style={{
          width: "min(92vw, 560px)",
          borderRadius: 24,
          padding: 24,
          textAlign: "center",
        }}
        ref={contentRef}
        tabIndex={-1}
        aria-labelledby="modal-title"
      >
        <h2
          id="modal-title"
          className="brand-title"
          style={{ fontSize: 28, margin: "4px 0 12px" }}
        >
          {title}
        </h2>
        <div style={{ opacity: 0.9, lineHeight: 1.6 }}>{children}</div>
        {actions && (
          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {React.Children.map(actions, (action, index) =>
              React.cloneElement(action, {
                className: `${action.props.className || ""} btn delay-${
                  index + 1
                }`.trim(),
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default Modal;
