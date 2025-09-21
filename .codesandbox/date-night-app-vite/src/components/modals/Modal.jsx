diff --git a/.codesandbox/date-night-app-vite/src/components/modals/Modal.jsx b/.codesandbox/date-night-app-vite/src/components/modals/Modal.jsx
index 7cdb3c359f36dd06a3ef063cdec78b6aca4799e5..3cf7d27f85377e2447981d4dfec841ac7d6bcef8 100644
--- a/.codesandbox/date-night-app-vite/src/components/modals/Modal.jsx
+++ b/.codesandbox/date-night-app-vite/src/components/modals/Modal.jsx
@@ -1,127 +1,87 @@
-diff --git a/.codesandbox/date-night-app-vite/src/components/modals/Modal.jsx b/.codesandbox/date-night-app-vite/src/components/modals/Modal.jsx
-index f7944cce46093dc374fcdc406496a0ac0802a5e8..9ac82fea60dd3b85213370c341b7c08531893a38 100644
---- a/.codesandbox/date-night-app-vite/src/components/modals/Modal.jsx
-+++ b/.codesandbox/date-night-app-vite/src/components/modals/Modal.jsx
-@@ -1,73 +1,83 @@
--import React, { useState, useEffect, useCallback, useRef } from 'react';
-+import React, { useCallback, useEffect, useRef, useState } from "react";
-+
-+const focusSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
- 
- const Modal = ({ isOpen, onClose, children }) => {
-   const [isClosing, setIsClosing] = useState(false);
-   const modalRef = useRef(null);
- 
--  const handleClose = useCallback(() => {
-+  const closeWithAnimation = useCallback(() => {
-     setIsClosing(true);
--    setTimeout(() => {
-+    window.setTimeout(() => {
-       onClose();
-       setIsClosing(false);
--    }, 300);
-+    }, 220);
-   }, [onClose]);
- 
-   useEffect(() => {
--    const handleEsc = (e) => {
--      if (e.key === "Escape") handleClose();
--    };
-+    if (!isOpen) {
-+      return undefined;
-+    }
-+
-+    const handleKeydown = (event) => {
-+      if (event.key === "Escape") {
-+        event.preventDefault();
-+        closeWithAnimation();
-+      }
-+
-+      if (event.key === "Tab" && modalRef.current) {
-+        const focusable = modalRef.current.querySelectorAll(focusSelectors);
-+        if (!focusable.length) {
-+          return;
-+        }
- 
--    const handleFocusTrap = (e) => {
--        if (e.key !== 'Tab' || !modalRef.current) return;
--        
--        const focusableElements = modalRef.current.querySelectorAll(
--            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
--        );
--        const firstElement = focusableElements[0];
--        const lastElement = focusableElements[focusableElements.length - 1];
-+        const first = focusable[0];
-+        const last = focusable[focusable.length - 1];
- 
--        if (e.shiftKey) { // Shift + Tab
--            if (document.activeElement === firstElement) {
--                lastElement.focus();
--                e.preventDefault();
--            }
--        } else { // Tab
--            if (document.activeElement === lastElement) {
--                firstElement.focus();
--                e.preventDefault();
--            }
-+        if (!event.shiftKey && document.activeElement === last) {
-+          event.preventDefault();
-+          first.focus();
-         }
-+
-+        if (event.shiftKey && document.activeElement === first) {
-+          event.preventDefault();
-+          last.focus();
-+        }
-+      }
-     };
- 
--    if (isOpen) {
--        window.addEventListener("keydown", handleEsc);
--        window.addEventListener("keydown", handleFocusTrap);
--        const focusableElements = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
--        focusableElements?.[0]?.focus();
--    }
-+    const previousOverflow = document.body.style.overflow;
-+    document.body.style.overflow = "hidden";
-+    window.addEventListener("keydown", handleKeydown);
-+
-+    window.requestAnimationFrame(() => {
-+      const focusable = modalRef.current?.querySelectorAll(focusSelectors);
-+      focusable?.[0]?.focus();
-+    });
- 
-     return () => {
--      window.removeEventListener("keydown", handleEsc);
--      window.removeEventListener("keydown", handleFocusTrap);
-+      document.body.style.overflow = previousOverflow;
-+      window.removeEventListener("keydown", handleKeydown);
-     };
--  }, [isOpen, handleClose]);
-+  }, [closeWithAnimation, isOpen]);
- 
--  if (!isOpen) return null;
-+  if (!isOpen) {
-+    return null;
-+  }
- 
-   return (
--    <div className={`modal-backdrop ${isClosing ? 'fade-out' : 'fade-in'}`} onClick={handleClose}>
-+    <div className={`modal-backdrop ${isClosing ? "fade-out" : "fade-in"}`} onClick={closeWithAnimation}>
-       <div
-         ref={modalRef}
--        className={`modal-content ${isClosing ? 'slide-out' : 'slide-in'}`}
--        onClick={(e) => e.stopPropagation()}
-+        className={`modal-content ${isClosing ? "slide-out" : "slide-in"}`}
-         role="dialog"
-         aria-modal="true"
-+        onClick={(event) => event.stopPropagation()}
-       >
-         {children}
-       </div>
-     </div>
-   );
- };
- 
- export default Modal;
--
+import React, { useCallback, useEffect, useRef, useState } from "react";
+
+const focusSelectors =
+  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
+
+const Modal = ({ isOpen, onClose, children }) => {
+  const [isClosing, setIsClosing] = useState(false);
+  const modalRef = useRef(null);
+
+  const closeWithAnimation = useCallback(() => {
+    setIsClosing(true);
+    window.setTimeout(() => {
+      onClose();
+      setIsClosing(false);
+    }, 220);
+  }, [onClose]);
+
+  useEffect(() => {
+    if (!isOpen) {
+      return undefined;
+    }
+
+    const handleKeydown = (event) => {
+      if (event.key === "Escape") {
+        event.preventDefault();
+        closeWithAnimation();
+      }
+
+      if (event.key === "Tab" && modalRef.current) {
+        const focusable = modalRef.current.querySelectorAll(focusSelectors);
+        if (!focusable.length) {
+          return;
+        }
+
+        const first = focusable[0];
+        const last = focusable[focusable.length - 1];
+
+        if (!event.shiftKey && document.activeElement === last) {
+          event.preventDefault();
+          first.focus();
+        }
+
+        if (event.shiftKey && document.activeElement === first) {
+          event.preventDefault();
+          last.focus();
+        }
+      }
+    };
+
+    const previousOverflow = document.body.style.overflow;
+    document.body.style.overflow = "hidden";
+    window.addEventListener("keydown", handleKeydown);
+
+    window.requestAnimationFrame(() => {
+      const focusable = modalRef.current?.querySelectorAll(focusSelectors);
+      focusable?.[0]?.focus();
+    });
+
+    return () => {
+      document.body.style.overflow = previousOverflow;
+      window.removeEventListener("keydown", handleKeydown);
+    };
+  }, [closeWithAnimation, isOpen]);
+
+  if (!isOpen) {
+    return null;
+  }
+
+  return (
+    <div
+      className={`modal-backdrop ${isClosing ? "fade-out" : "fade-in"}`}
+      onClick={closeWithAnimation}
+    >
+      <div
+        ref={modalRef}
+        className={`modal-content ${isClosing ? "slide-out" : "slide-in"}`}
+        role="dialog"
+        aria-modal="true"
+        onClick={(event) => event.stopPropagation()}
+      >
+        {children}
+      </div>
+    </div>
+  );
+};
+
+export default Modal;
