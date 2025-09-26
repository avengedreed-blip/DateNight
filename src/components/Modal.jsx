import React, { useState, useEffect, memo } from "react";

const Modal = memo(({ title, open, onClose, children, actions }) => {
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsEntering(true), 50);
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
      >
        <h2 className="brand-title" style={{ fontSize: 28, margin: "4px 0 12px" }}>
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
