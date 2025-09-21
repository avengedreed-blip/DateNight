diff --git a/.codesandbox/date-night-app-vite/src/components/modals/PromptModal.jsx b/.codesandbox/date-night-app-vite/src/components/modals/PromptModal.jsx
index 2cd87455eff2a2ee37c682e533b980aa0ae17f59..a72cc84f510a09af77dfe06aaddf393c0f4fdabe 100644
--- a/.codesandbox/date-night-app-vite/src/components/modals/PromptModal.jsx
+++ b/.codesandbox/date-night-app-vite/src/components/modals/PromptModal.jsx
@@ -1,45 +1,21 @@
-diff --git a/.codesandbox/date-night-app-vite/src/components/modals/PromptModal.jsx b/.codesandbox/date-night-app-vite/src/components/modals/PromptModal.jsx
-index 9712513073fe2bf92741328f56cfc4be5dd1a5d4..a72cc84f510a09af77dfe06aaddf393c0f4fdabe 100644
---- a/.codesandbox/date-night-app-vite/src/components/modals/PromptModal.jsx
-+++ b/.codesandbox/date-night-app-vite/src/components/modals/PromptModal.jsx
-@@ -1,29 +1,21 @@
- import React from "react";
- import Modal from "./Modal.jsx";
- 
- const PromptModal = ({ isOpen, onClose, prompt, onRefuse }) => (
-   <Modal isOpen={isOpen} onClose={onClose}>
--    <h2 className="text-3xl font-bold text-shadow mb-4 tracking-tight">
--      {prompt.title}
--    </h2>
--    <p className="text-[var(--text-secondary)] mb-8 min-h-[60px] text-lg">
--      {prompt.text}
--    </p>
--    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
--      <button
--        onClick={onRefuse}
--        className="modal-button bg-black/20 hover:bg-black/40 border-white/20"
--      >
--        Refuse
--      </button>
--      <button
--        onClick={onClose}
--        className="modal-button bg-[var(--primary-accent)]/80 hover:bg-[var(--primary-accent)] border-transparent"
--      >
--        Accept
--      </button>
-+    <div className="prompt-card">
-+      <h2 className="prompt-card__title">{prompt.title}</h2>
-+      <p className="prompt-card__body">{prompt.text}</p>
-+      <div className="prompt-card__actions">
-+        <button type="button" className="secondary-button" onClick={onRefuse}>
-+          Refuse
-+        </button>
-+        <button type="button" className="primary-button" onClick={onClose}>
-+          Accept
-+        </button>
-+      </div>
-     </div>
-   </Modal>
- );
- 
- export default PromptModal;
+import React from "react";
+import Modal from "./Modal.jsx";
+
+const PromptModal = ({ isOpen, onClose, prompt, onRefuse }) => (
+  <Modal isOpen={isOpen} onClose={onClose}>
+    <div className="prompt-card">
+      <h2 className="prompt-card__title">{prompt.title}</h2>
+      <p className="prompt-card__body">{prompt.text}</p>
+      <div className="prompt-card__actions">
+        <button type="button" className="secondary-button" onClick={onRefuse}>
+          Refuse
+        </button>
+        <button type="button" className="primary-button" onClick={onClose}>
+          Accept
+        </button>
+      </div>
+    </div>
+  </Modal>
+);
+
+export default PromptModal;
