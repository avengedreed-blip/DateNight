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
  const titleId = "editor-modal-title";
  const descriptionId = "editor-modal-description";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
    >
      <div className="editor-layout">
        <header className="app-panel__top-bar">
          <div>
            <h2 id={titleId} className="m-0 text-2xl font-semibold text-slate-100">
              Prompt Editor
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-[color:var(--text-muted)]">
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
              <h3 className="mb-3 text-sm uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{promptGroup}</h3>
              <div className="flex flex-col gap-3">
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
            className="primary-button flex items-center gap-2"
          >
            <PlusIcon /> Add
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default EditorModal;
