import React, { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import { PlusIcon, TrashIcon, XIcon } from "../icons/Icons.jsx";
import {
  generatePromptIdea,
  getGeneratorPool,
} from "../../utils/promptGenerator.js";

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
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [generatedMeta, setGeneratedMeta] = useState(null);
  const [generatorError, setGeneratorError] = useState("");
  const titleId = "editor-modal-title";
  const descriptionId = "editor-modal-description";
  const isCustomPane = pane === "custom";
  const activePrompts = isCustomPane ? prompts : generatedPrompts;
  const isTriviaCategory = category === "triviaQuestions";
  const generatorGroup = isTriviaCategory ? "normal" : group;
  const generatorPool = useMemo(
    () => getGeneratorPool(category, generatorGroup),
    [category, generatorGroup]
  );
  const generatorMatchesSelection = useMemo(() => {
    if (!generatedMeta) {
      return true;
    }

    const targetGroup = generatedMeta.group;
    const targetCategory = generatedMeta.category;
    const normalizedGroup = isTriviaCategory ? "normal" : generatorGroup;
    return (
      targetCategory === category &&
      (targetGroup ?? "normal") === (normalizedGroup ?? "normal")
    );
  }, [category, generatedMeta, generatorGroup, isTriviaCategory]);
  const intensityLabels = useMemo(
    () => ({
      normal: "Normal",
      spicy: "Spicy",
      extreme: "Extreme",
    }),
    []
  );

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

  const buildPromptUpdate = useCallback(
    (categoryKey, groupKey, updater) => {
      const categoryPrompts =
        (prompts?.[categoryKey] && typeof prompts[categoryKey] === "object"
          ? prompts[categoryKey]
          : {}) ?? {};
      const groupPrompts = Array.isArray(categoryPrompts[groupKey])
        ? categoryPrompts[groupKey]
        : [];

      return {
        ...prompts,
        [categoryKey]: {
          ...categoryPrompts,
          [groupKey]: updater(groupPrompts),
        },
      };
    },
    [prompts]
  );

  const updatePrompt = (targetGroup, index, value) => {
    if (!isCustomPane) {
      return;
    }
    const nextPrompts = buildPromptUpdate(category, targetGroup, (items) =>
      items.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
    setPrompts(nextPrompts);
  };

  const removePrompt = (targetGroup, index) => {
    if (!isCustomPane) {
      return;
    }
    const nextPrompts = buildPromptUpdate(category, targetGroup, (items) =>
      items.filter((_, itemIndex) => itemIndex !== index)
    );
    setPrompts(nextPrompts);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isCustomPane || !draftPrompt.trim()) {
      return;
    }

    handleButtonClick?.();

    const targetGroup = group ?? "normal";
    const trimmed = draftPrompt.trim();
    const nextPrompts = buildPromptUpdate(category, targetGroup, (items) => [
      ...items,
      trimmed,
    ]);
    setPrompts(nextPrompts);
    setDraftPrompt("");
  };

  const handleGeneratePrompt = withButtonClick(() => {
    const idea = generatePromptIdea(category, generatorGroup);
    if (!idea) {
      setGeneratorError(
        "No prompts available for that combination. Try another intensity."
      );
      setGeneratedDraft("");
      setGeneratedMeta(null);
      return;
    }

    setGeneratorError("");
    setGeneratedDraft(idea);
    setGeneratedMeta({ category, group: generatorGroup ?? "normal" });
  });

  const handleApproveGenerated = withButtonClick(() => {
    if (!generatedDraft.trim() || !generatedMeta) {
      return;
    }

    const trimmed = generatedDraft.trim();
    const targetCategory = generatedMeta.category;
    const targetGroup = generatedMeta.group ?? "normal";
    const nextPrompts = buildPromptUpdate(targetCategory, targetGroup, (
      items
    ) => [...items, trimmed]);
    setPrompts(nextPrompts);
    setGeneratedDraft("");
    setGeneratedMeta(null);
  });

  useEffect(() => {
    if (!isCustomPane) {
      setGeneratedDraft("");
      setGeneratedMeta(null);
      setGeneratorError("");
    }
  }, [isCustomPane]);

  const groups = availableGroups;
  const generatorTargetLabel = useMemo(() => {
    if (!generatedMeta) {
      return "";
    }

    const categoryLabel =
      categoryOptions.find((option) => option.value === generatedMeta.category)
        ?.label ?? "";
    const intensityLabel =
      intensityLabels[generatedMeta.group ?? "normal"] ?? "Normal";

    if (generatedMeta.category === "triviaQuestions") {
      return `${categoryLabel}`;
    }

    return `${categoryLabel} • ${intensityLabel}`;
  }, [generatedMeta, intensityLabels]);
  const canApproveGenerated =
    Boolean(generatedDraft.trim() && generatedMeta) && generatorMatchesSelection;

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

        {isCustomPane && (
          <section className="editor-generator" aria-live="polite">
            <div className="editor-generator__header">
              <div>
                <p className="editor-generator__title">Prompt Generator</p>
                <p className="editor-generator__subtitle">
                  Create fresh {" "}
                  {
                    categoryOptions.find((option) => option.value === category)
                      ?.label
                  }{" "}
                  prompts with one click.
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleGeneratePrompt}
                disabled={generatorPool.length === 0}
              >
                {generatedDraft ? "New Idea" : "Generate Prompt"}
              </button>
            </div>
            {generatorError ? (
              <p className="editor-generator__error">{generatorError}</p>
            ) : null}
            {generatedDraft ? (
              <>
                {generatorTargetLabel ? (
                  <p className="editor-generator__preview-meta">
                    Generated for {generatorTargetLabel}
                  </p>
                ) : null}
                <textarea
                  className="editor-textarea"
                  value={generatedDraft}
                  onChange={(event) => setGeneratedDraft(event.target.value)}
                />
                {!generatorMatchesSelection && (
                  <p className="editor-generator__hint">
                    Switch back to {generatorTargetLabel || "the original selection"}
                    {" "}
                    to approve this prompt, or generate a new one for the current
                    filters.
                  </p>
                )}
                <div className="editor-generator__actions">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!canApproveGenerated}
                    onClick={handleApproveGenerated}
                  >
                    Approve &amp; Add
                  </button>
                </div>
              </>
            ) : (
              <p className="editor-generator__subtitle">
                Pick a category and intensity, then let the generator suggest a
                new prompt. Edit anything before approving to suit your vibe.
              </p>
            )}
          </section>
        )}

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
