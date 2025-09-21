import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { PlusIcon, TrashIcon, XIcon } from "../icons/Icons.jsx";

const categoryOptions = [
  { value: "truthPrompts", label: "Truth" },
  { value: "darePrompts", label: "Dare" },
  { value: "triviaQuestions", label: "Trivia" },
  { value: "consequences", label: "Consequences" },
];

const EditorModal = ({ isOpen, onClose, prompts, setPrompts }) => {
  const [category, setCategory] = useState("truthPrompts");
  const [group, setGroup] = useState("normal");
  const [draftPrompt, setDraftPrompt] = useState("");

  useEffect(() => {
    if (!prompts || !prompts[category]) {
      return;
    }
    const availableGroups = Object.keys(prompts[category]);
    if (!availableGroups.includes(group)) {
      setGroup(availableGroups[0]);
    }
  }, [category, group, prompts]);

  const updatePrompt = (targetGroup, index, value) => {
    setPrompts({
      ...prompts,
      [category]: {
        ...prompts[category],
        [targetGroup]: prompts[category][targetGroup].map((item, itemIndex) =>
          itemIndex === index ? value : item
        ),
      },
    });
  };

  const removePrompt = (targetGroup, index) => {
    setPrompts({
      ...prompts,
      [category]: {
        ...prompts[category],
        [targetGroup]: prompts[category][targetGroup].filter(
          (_, itemIndex) => itemIndex !== index
        ),
      },
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draftPrompt.trim()) {
      return;
    }

    setPrompts({
      ...prompts,
      [category]: {
        ...prompts[category],
        [group]: [...(prompts[category][group] ?? []), draftPrompt.trim()],
      },
    });
    setDraftPrompt("");
  };

  const groups = prompts?.[category] ? Object.keys(prompts[category]) : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="editor-layout">
        <header className="app-panel__top-bar">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Prompt Editor</h2>
            <p style={{ margin: "0.35rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Curate the perfect mix for your date night.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close editor"
            onClick={onClose}
          >
            <XIcon />
          </button>
        </header>

        <div className="editor-action-bar">
          <select
            className="editor-select"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {groups.length > 1 && (
            <select
              className="editor-select"
              value={group}
              onChange={(event) => setGroup(event.target.value)}
            >
              {groups.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="editor-scroll">
          {groups.length === 0 && (
            <p className="editor-empty-state">No prompts available.</p>
          )}
          {groups.map((promptGroup) => (
            <section key={promptGroup}>
              <h3
                style={{
                  margin: "0 0 0.75rem",
                  fontSize: "1rem",
                  textTransform: "capitalize",
                  color: "var(--text-muted)",
                  letterSpacing: "0.12em",
                }}
              >
                {promptGroup}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {prompts[category][promptGroup].map((promptValue, index) => (
                  <div className="editor-prompt-row" key={`${promptGroup}-${index}`}>
                    <textarea
                      className="editor-textarea"
                      value={promptValue}
                      onChange={(event) =>
                        updatePrompt(promptGroup, index, event.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Delete prompt"
                      onClick={() => removePrompt(promptGroup, index)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <form className="editor-action-bar" onSubmit={handleSubmit}>
          <textarea
            className="editor-textarea"
            placeholder="Add a new prompt"
            value={draftPrompt}
            onChange={(event) => setDraftPrompt(event.target.value)}
          />
          <button
            type="submit"
            className="primary-button"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <PlusIcon /> Add
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default EditorModal;
