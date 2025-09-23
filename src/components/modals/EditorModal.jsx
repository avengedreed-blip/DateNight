import React, { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import { PlusIcon, TrashIcon, XIcon } from "../icons/Icons.jsx";

const categoryOptions = [
  { value: "truthPrompts", label: "Truth" },
  { value: "darePrompts", label: "Dare" },
  { value: "triviaQuestions", label: "Trivia" },
  { value: "consequences", label: "Consequences" },
];

const viewOptions = [
  { value: "custom", label: "Custom Prompts" },
  { value: "generated", label: "Generated Mix" },
];

const EditorModal = ({
  isOpen,
  onClose,
  prompts,
  setPrompts,
  generatedPrompts,
  onRegeneratePrompts,
  onButtonClick: handleButtonClick,
}) => {
  const [category, setCategory] = useState("truthPrompts");
  const [group, setGroup] = useState("normal");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [pane, setPane] = useState("custom");
  const titleId = "editor-modal-title";
  const descriptionId = "editor-modal-description";
  const isCustomPane = pane === "custom";
  const activePrompts = isCustomPane ? prompts : generatedPrompts;

  const availableGroups = useMemo(() => {
    if (!activePrompts || !activePrompts[category]) {
      return [];
    }
    return Object.keys(activePrompts[category]);
  }, [activePrompts, category]);

  const withButtonClick = useCallback(
    (callback) =>
      (...args) => {
        handleButtonClick?.();
        return callback?.(...args);
      },
    [handleButtonClick]
  );

  useEffect(() => {
    if (!activePrompts || activePrompts[category]) {
      if (availableGroups.length && !availableGroups.includes(group)) {
        setGroup(availableGroups[0]);
      }
      return;
    }

    const fallback = categoryOptions.find((option) =>
      Boolean(activePrompts?.[option.value])
    );
    if (fallback) {
      setCategory(fallback.value);
    }
  }, [activePrompts, availableGroups, category, group]);

  const updatePrompt = (targetGroup, index, value) => {
    if (!isCustomPane) {
      return;
    }
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
    if (!isCustomPane) {
      return;
    }
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
    if (!isCustomPane || !draftPrompt.trim()) {
      return;
    }

    handleButtonClick?.();

    setPrompts({
      ...prompts,
      [category]: {
        ...prompts[category],
        [group]: [...(prompts[category][group] ?? []), draftPrompt.trim()],
      },
    });
    setDraftPrompt("");
  };

  const groups = availableGroups;

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
            <p
              id={descriptionId}
              className="mt-1 text-sm text-[color:var(--text-muted)]"
            >
              Curate the perfect mix for your date night.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close editor"
            onClick={withButtonClick(onClose)}
          >
            <XIcon />
          </button>
        </header>

        <div
          className="editor-mode-toggle"
          role="tablist"
          aria-label="Prompt source"
        >
          {viewOptions.map((option) => {
            const isActive = pane === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`editor-mode-toggle__button ${
                  isActive ? "editor-mode-toggle__button--active" : ""
                }`}
                role="tab"
                aria-selected={isActive}
                onClick={withButtonClick(() => setPane(option.value))}
              >
                {option.label}
              </button>
            );
          })}
        </div>

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

        {!isCustomPane && (
          <div className="editor-generated-bar">
            <p className="editor-generated-note">
              Freshly generated prompts spice up each new game. Want a new mix?
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={withButtonClick(() => onRegeneratePrompts?.())}
            >
              Regenerate Mix
            </button>
          </div>
        )}

        <div className="editor-scroll">
          {groups.length === 0 && (
            <p className="editor-empty-state">No prompts available.</p>
          )}
          {groups.map((promptGroup) => (
            <section key={promptGroup}>
              <h3 className="mb-3 text-sm uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {promptGroup}
              </h3>
              <div className="flex flex-col gap-3">
                {activePrompts?.[category]?.[promptGroup]?.map(
                  (promptValue, index) => (
                    <div
                      className={`editor-prompt-row ${
                        isCustomPane ? "" : "editor-prompt-row--readonly"
                      }`}
                      key={`${promptGroup}-${index}`}
                    >
                      <textarea
                        className={`editor-textarea ${
                          isCustomPane ? "" : "editor-textarea--readonly"
                        }`}
                        value={promptValue}
                        onChange={(event) =>
                          updatePrompt(promptGroup, index, event.target.value)
                        }
                        readOnly={!isCustomPane}
                      />
                      {isCustomPane && (
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="Delete prompt"
                          onClick={withButtonClick(() =>
                            removePrompt(promptGroup, index)
                          )}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        {isCustomPane && (
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
        )}
      </div>
    </Modal>
  );
};

export default EditorModal;
