diff --git a/.codesandbox/date-night-app-vite/src/components/modals/EditorModal.jsx b/.codesandbox/date-night-app-vite/src/components/modals/EditorModal.jsx
index f704596c21a8026973f55c134048b43fb90516e6..bb3271ecb704003412d5e3a00fb5f7e529ede218 100644
--- a/.codesandbox/date-night-app-vite/src/components/modals/EditorModal.jsx
+++ b/.codesandbox/date-night-app-vite/src/components/modals/EditorModal.jsx
@@ -1,282 +1,178 @@
-diff --git a/.codesandbox/date-night-app-vite/src/components/modals/EditorModal.jsx b/.codesandbox/date-night-app-vite/src/components/modals/EditorModal.jsx
-index 7b042f07dea0c90e84f8245b15a503e08ae03709..4e35c41d8c9c6d34550897352b31b5914c90fa9a 100644
---- a/.codesandbox/date-night-app-vite/src/components/modals/EditorModal.jsx
-+++ b/.codesandbox/date-night-app-vite/src/components/modals/EditorModal.jsx
-@@ -1,164 +1,157 @@
--import React, { useState, useEffect } from "react";
-+import React, { useEffect, useState } from "react";
- import Modal from "./Modal.jsx";
--import { XIcon, TrashIcon, PlusIcon } from "../icons/Icons.jsx";
-+import { PlusIcon, TrashIcon, XIcon } from "../icons/Icons.jsx";
- 
- const EditorModal = ({ isOpen, onClose, prompts, setPrompts }) => {
-   const [category, setCategory] = useState("truthPrompts");
--  const [newPromptText, setNewPromptText] = useState("");
--  const [newPromptGroup, setNewPromptGroup] = useState("normal");
-+  const [group, setGroup] = useState("normal");
-+  const [draftPrompt, setDraftPrompt] = useState("");
- 
--  const handlePromptChange = (group, index, value) => {
--    const newPrompts = {
-+  useEffect(() => {
-+    if (!prompts || !prompts[category]) {
-+      return;
-+    }
-+    const availableGroups = Object.keys(prompts[category]);
-+    if (!availableGroups.includes(group)) {
-+      setGroup(availableGroups[0]);
-+    }
-+  }, [category, group, prompts]);
-+
-+  const updatePrompt = (targetGroup, index, value) => {
-+    setPrompts({
-       ...prompts,
-       [category]: {
-         ...prompts[category],
--        [group]: prompts[category][group].map((item, i) =>
--          i === index ? value : item
-+        [targetGroup]: prompts[category][targetGroup].map((item, itemIndex) =>
-+          itemIndex === index ? value : item
-         ),
-       },
--    };
--    setPrompts(newPrompts);
-+    });
-   };
- 
--  const handlePromptDelete = (group, index) => {
--    const newPrompts = {
-+  const removePrompt = (targetGroup, index) => {
-+    setPrompts({
-       ...prompts,
-       [category]: {
-         ...prompts[category],
--        [group]: prompts[category][group].filter((_, i) => i !== index),
-+        [targetGroup]: prompts[category][targetGroup].filter((_, itemIndex) => itemIndex !== index),
-       },
--    };
--    setPrompts(newPrompts);
-+    });
-   };
- 
--  const handleAddPrompt = (e) => {
--    e.preventDefault();
--    if (newPromptText.trim() === "") return;
--    const targetGroup = newPromptGroup || Object.keys(prompts[category])[0];
--    const newPrompts = {
-+  const handleSubmit = (event) => {
-+    event.preventDefault();
-+    if (!draftPrompt.trim()) {
-+      return;
-+    }
-+
-+    setPrompts({
-       ...prompts,
-       [category]: {
-         ...prompts[category],
--        [targetGroup]: [
--          ...(prompts[category][targetGroup] || []),
--          newPromptText.trim(),
--        ],
-+        [group]: [...(prompts[category][group] ?? []), draftPrompt.trim()],
-       },
--    };
--    setPrompts(newPrompts);
--    setNewPromptText("");
-+    });
-+    setDraftPrompt("");
-   };
- 
--  useEffect(() => {
--    if (prompts && prompts[category]) {
--      setNewPromptGroup(Object.keys(prompts[category])[0]);
--    }
--  }, [category, prompts]);
-+  const categoryOptions = [
-+    { value: "truthPrompts", label: "Truth" },
-+    { value: "darePrompts", label: "Dare" },
-+    { value: "triviaQuestions", label: "Trivia" },
-+    { value: "consequences", label: "Consequences" },
-+  ];
-+
-+  const groups = prompts?.[category] ? Object.keys(prompts[category]) : [];
- 
-   return (
-     <Modal isOpen={isOpen} onClose={onClose}>
--      <div className="w-full max-w-lg mx-auto h-[80vh] flex flex-col p-0">
--        <div className="flex justify-between items-center mb-4 flex-shrink-0">
--          <h2 className="text-2xl font-bold text-white">Prompt Editor</h2>
--          <button onClick={onClose} className="text-gray-400 hover:text-white">
-+      <div className="editor-layout">
-+        <header className="app-panel__top-bar">
-+          <div>
-+            <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Prompt Editor</h2>
-+            <p style={{ margin: "0.35rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
-+              Curate the perfect mix for your date night.
-+            </p>
-+          </div>
-+          <button type="button" className="icon-button" aria-label="Close editor" onClick={onClose}>
-             <XIcon />
-           </button>
--        </div>
--        <div className="flex border-b border-[var(--border-color)] mb-4 flex-shrink-0">
-+        </header>
-+
-+        <div className="editor-action-bar">
-           <select
-+            className="editor-select"
-             value={category}
--            onChange={(e) => setCategory(e.target.value)}
--            className="w-full bg-transparent text-white p-2 focus:outline-none appearance-none"
-+            onChange={(event) => setCategory(event.target.value)}
-           >
--            <option className="bg-[var(--bg-secondary)]" value="truthPrompts">
--              Truth
--            </option>
--            <option className="bg-[var(--bg-secondary)]" value="darePrompts">
--              Dare
--            </option>
--            <option
--              className="bg-[var(--bg-secondary)]"
--              value="triviaQuestions"
--            >
--              Trivia
--            </option>
--            <option className="bg-[var(--bg-secondary)]" value="consequences">
--              Consequences
--            </option>
-+            {categoryOptions.map((option) => (
-+              <option key={option.value} value={option.value}>
-+                {option.label}
-+              </option>
-+            ))}
-           </select>
-+          {groups.length > 1 && (
-+            <select className="editor-select" value={group} onChange={(event) => setGroup(event.target.value)}>
-+              {groups.map((option) => (
-+                <option key={option} value={option}>
-+                  {option}
-+                </option>
-+              ))}
-+            </select>
-+          )}
-         </div>
--        <div className="flex-grow overflow-y-auto pr-2 space-y-6 text-left">
--          {prompts &&
--            prompts[category] &&
--            Object.entries(prompts[category]).map(([group, list]) => (
--              <div key={group}>
--                <h3 className="text-lg font-semibold text-[var(--primary-accent)] capitalize mb-2 tracking-wider">
--                  {group}
--                </h3>
--                <div className="space-y-2">
--                  {list.map((prompt, index) => (
--                    <div key={index} className="flex items-center space-x-2">
--                      <input
--                        type="text"
--                        value={prompt}
--                        onChange={(e) =>
--                          handlePromptChange(group, index, e.target.value)
--                        }
--                        className="w-full p-2 rounded-md bg-[var(--bg-main)] border border-[var(--border-color)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
--                      />
--                      <button
--                        onClick={() => handlePromptDelete(group, index)}
--                        className="text-pink-400 hover:text-pink-300 p-1"
--                      >
--                        <TrashIcon />
--                      </button>
--                    </div>
--                  ))}
--                </div>
-+
-+        <div className="editor-scroll">
-+          {groups.length === 0 && <p className="editor-empty-state">No prompts available.</p>}
-+          {groups.map((promptGroup) => (
-+            <section key={promptGroup}>
-+              <h3 style={{
-+                margin: "0 0 0.75rem",
-+                fontSize: "1rem",
-+                textTransform: "capitalize",
-+                color: "var(--text-muted)",
-+                letterSpacing: "0.12em",
-+              }}>
-+                {promptGroup}
-+              </h3>
-+              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
-+                {prompts[category][promptGroup].map((promptValue, index) => (
-+                  <div className="editor-prompt-row" key={`${promptGroup}-${index}`}>
-+                    <textarea
-+                      className="editor-textarea"
-+                      value={promptValue}
-+                      onChange={(event) => updatePrompt(promptGroup, index, event.target.value)}
-+                    />
-+                    <button
-+                      type="button"
-+                      className="icon-button"
-+                      aria-label="Delete prompt"
-+                      onClick={() => removePrompt(promptGroup, index)}
-+                    >
-+                      <TrashIcon />
-+                    </button>
-+                  </div>
-+                ))}
-               </div>
--            ))}
-+            </section>
-+          ))}
-         </div>
--        <form
--          onSubmit={handleAddPrompt}
--          className="mt-4 flex-shrink-0 border-t border-[var(--border-color)] pt-4 space-y-3"
--        >
--          <h3 className="text-lg font-semibold text-[var(--primary-accent)] text-left">
--            Add New Prompt
--          </h3>
--          <div className="flex space-x-2">
--            <input
--              type="text"
--              value={newPromptText}
--              onChange={(e) => setNewPromptText(e.target.value)}
--              placeholder="Type your new prompt..."
--              className="w-full p-2 rounded-md bg-[var(--bg-main)] border border-[var(--border-color)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
--            />
--            {prompts &&
--              prompts[category] &&
--              Object.keys(prompts[category]).length > 1 && (
--                <select
--                  value={newPromptGroup}
--                  onChange={(e) => setNewPromptGroup(e.target.value)}
--                  className="bg-[var(--bg-main)] border border-[var(--border-color)] text-white p-2 rounded-md focus:outline-none capitalize"
--                >
--                  {Object.keys(prompts[category]).map((group) => (
--                    <option key={group} value={group} className="capitalize">
--                      {group}
--                    </option>
--                  ))}
--                </select>
--              )}
--          </div>
--          <button
--            type="submit"
--            className="modal-button bg-[var(--primary-accent)]/80 hover:bg-[var(--primary-accent)] border-transparent w-full"
--          >
--            <PlusIcon /> Add Prompt
-+
-+        <form className="editor-action-bar" onSubmit={handleSubmit}>
-+          <textarea
-+            className="editor-textarea"
-+            placeholder="Add a new prompt"
-+            value={draftPrompt}
-+            onChange={(event) => setDraftPrompt(event.target.value)}
-+          />
-+          <button type="submit" className="primary-button" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
-+            <PlusIcon /> Add
-           </button>
-         </form>
-       </div>
-     </Modal>
-   );
- };
- 
- export default EditorModal;
+import React, { useEffect, useState } from "react";
+import Modal from "./Modal.jsx";
+import { PlusIcon, TrashIcon, XIcon } from "../icons/Icons.jsx";
+
+const categoryOptions = [
+  { value: "truthPrompts", label: "Truth" },
+  { value: "darePrompts", label: "Dare" },
+  { value: "triviaQuestions", label: "Trivia" },
+  { value: "consequences", label: "Consequences" },
+];
+
+const EditorModal = ({ isOpen, onClose, prompts, setPrompts }) => {
+  const [category, setCategory] = useState("truthPrompts");
+  const [group, setGroup] = useState("normal");
+  const [draftPrompt, setDraftPrompt] = useState("");
+
+  useEffect(() => {
+    if (!prompts || !prompts[category]) {
+      return;
+    }
+    const availableGroups = Object.keys(prompts[category]);
+    if (!availableGroups.includes(group)) {
+      setGroup(availableGroups[0]);
+    }
+  }, [category, group, prompts]);
+
+  const updatePrompt = (targetGroup, index, value) => {
+    setPrompts({
+      ...prompts,
+      [category]: {
+        ...prompts[category],
+        [targetGroup]: prompts[category][targetGroup].map((item, itemIndex) =>
+          itemIndex === index ? value : item
+        ),
+      },
+    });
+  };
+
+  const removePrompt = (targetGroup, index) => {
+    setPrompts({
+      ...prompts,
+      [category]: {
+        ...prompts[category],
+        [targetGroup]: prompts[category][targetGroup].filter(
+          (_, itemIndex) => itemIndex !== index
+        ),
+      },
+    });
+  };
+
+  const handleSubmit = (event) => {
+    event.preventDefault();
+    if (!draftPrompt.trim()) {
+      return;
+    }
+
+    setPrompts({
+      ...prompts,
+      [category]: {
+        ...prompts[category],
+        [group]: [...(prompts[category][group] ?? []), draftPrompt.trim()],
+      },
+    });
+    setDraftPrompt("");
+  };
+
+  const groups = prompts?.[category] ? Object.keys(prompts[category]) : [];
+
+  return (
+    <Modal isOpen={isOpen} onClose={onClose}>
+      <div className="editor-layout">
+        <header className="app-panel__top-bar">
+          <div>
+            <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Prompt Editor</h2>
+            <p style={{ margin: "0.35rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
+              Curate the perfect mix for your date night.
+            </p>
+          </div>
+          <button
+            type="button"
+            className="icon-button"
+            aria-label="Close editor"
+            onClick={onClose}
+          >
+            <XIcon />
+          </button>
+        </header>
+
+        <div className="editor-action-bar">
+          <select
+            className="editor-select"
+            value={category}
+            onChange={(event) => setCategory(event.target.value)}
+          >
+            {categoryOptions.map((option) => (
+              <option key={option.value} value={option.value}>
+                {option.label}
+              </option>
+            ))}
+          </select>
+          {groups.length > 1 && (
+            <select
+              className="editor-select"
+              value={group}
+              onChange={(event) => setGroup(event.target.value)}
+            >
+              {groups.map((option) => (
+                <option key={option} value={option}>
+                  {option}
+                </option>
+              ))}
+            </select>
+          )}
+        </div>
+
+        <div className="editor-scroll">
+          {groups.length === 0 && (
+            <p className="editor-empty-state">No prompts available.</p>
+          )}
+          {groups.map((promptGroup) => (
+            <section key={promptGroup}>
+              <h3
+                style={{
+                  margin: "0 0 0.75rem",
+                  fontSize: "1rem",
+                  textTransform: "capitalize",
+                  color: "var(--text-muted)",
+                  letterSpacing: "0.12em",
+                }}
+              >
+                {promptGroup}
+              </h3>
+              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
+                {prompts[category][promptGroup].map((promptValue, index) => (
+                  <div className="editor-prompt-row" key={`${promptGroup}-${index}`}>
+                    <textarea
+                      className="editor-textarea"
+                      value={promptValue}
+                      onChange={(event) =>
+                        updatePrompt(promptGroup, index, event.target.value)
+                      }
+                    />
+                    <button
+                      type="button"
+                      className="icon-button"
+                      aria-label="Delete prompt"
+                      onClick={() => removePrompt(promptGroup, index)}
+                    >
+                      <TrashIcon />
+                    </button>
+                  </div>
+                ))}
+              </div>
+            </section>
+          ))}
+        </div>
+
+        <form className="editor-action-bar" onSubmit={handleSubmit}>
+          <textarea
+            className="editor-textarea"
+            placeholder="Add a new prompt"
+            value={draftPrompt}
+            onChange={(event) => setDraftPrompt(event.target.value)}
+          />
+          <button
+            type="submit"
+            className="primary-button"
+            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
+          >
+            <PlusIcon /> Add
+          </button>
+        </form>
+      </div>
+    </Modal>
+  );
+};
+
+export default EditorModal;
