diff --git a/.codesandbox/date-night-app-vite/src/components/modals/AnnouncementModal.jsx b/.codesandbox/date-night-app-vite/src/components/modals/AnnouncementModal.jsx
index 1fb91c04e995d7e75ead8967abeff4cd750908d9..bf5f8d03cdfde1018d208aec257c3639812d34f2 100644
--- a/.codesandbox/date-night-app-vite/src/components/modals/AnnouncementModal.jsx
+++ b/.codesandbox/date-night-app-vite/src/components/modals/AnnouncementModal.jsx
@@ -1,41 +1,21 @@
-diff --git a/.codesandbox/date-night-app-vite/src/components/modals/AnnouncementModal.jsx b/.codesandbox/date-night-app-vite/src/components/modals/AnnouncementModal.jsx
-index 0c56ad3a149e8bb24319240b84acb7304f916305..bf5f8d03cdfde1018d208aec257c3639812d34f2 100644
---- a/.codesandbox/date-night-app-vite/src/components/modals/AnnouncementModal.jsx
-+++ b/.codesandbox/date-night-app-vite/src/components/modals/AnnouncementModal.jsx
-@@ -1,26 +1,21 @@
- import React from "react";
- import Modal from "./Modal.jsx";
- 
- const AnnouncementModal = ({ isOpen, onClose }) => (
-   <Modal isOpen={isOpen} onClose={onClose}>
--    <div className="border-2 border-yellow-400/80 p-6 rounded-xl relative">
--      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-yellow-400 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider text-yellow-900">
--        Extreme Round
--      </div>
--      <h2 className="text-3xl font-bold text-yellow-300 mb-4 mt-4 text-shadow">
--        Get Ready!
--      </h2>
--      <p className="text-[var(--text-secondary)] mb-8 text-lg">
--        This is an EXTREME round. The stakes are higher!
-+    <div className="announcement-card">
-+      <h2 className="announcement-card__title">Extreme Round</h2>
-+      <p className="announcement-card__body">
-+        Buckle up! For this spin the stakes are higher, the prompts are wilder,
-+        and bragging rights are on the line.
-       </p>
--      <button
--        onClick={onClose}
--        className="modal-button bg-yellow-400/80 hover:bg-yellow-400 text-yellow-900 border-transparent"
--      >
--        Let's Go!
--      </button>
-+      <div className="announcement-card__actions">
-+        <button type="button" className="primary-button" onClick={onClose}>
-+          Let's Go
-+        </button>
-+      </div>
-     </div>
-   </Modal>
- );
- 
- export default AnnouncementModal;
+import React from "react";
+import Modal from "./Modal.jsx";
+
+const AnnouncementModal = ({ isOpen, onClose }) => (
+  <Modal isOpen={isOpen} onClose={onClose}>
+    <div className="announcement-card">
+      <h2 className="announcement-card__title">Extreme Round</h2>
+      <p className="announcement-card__body">
+        Buckle up! For this spin the stakes are higher, the prompts are wilder,
+        and bragging rights are on the line.
+      </p>
+      <div className="announcement-card__actions">
+        <button type="button" className="primary-button" onClick={onClose}>
+          Let's Go
+        </button>
+      </div>
+    </div>
+  </Modal>
+);
+
+export default AnnouncementModal;
