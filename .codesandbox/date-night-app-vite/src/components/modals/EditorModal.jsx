import React, { useState, useEffect } from "react";
import Modal from "./Modal.jsx";
import { XIcon, TrashIcon, PlusIcon } from "../icons/Icons.jsx";

const EditorModal = ({ isOpen, onClose, prompts, setPrompts }) => {
  const [category, setCategory] = useState("truthPrompts");
  const [newPromptText, setNewPromptText] = useState("");
  const [newPromptGroup, setNewPromptGroup] = useState("normal");

  const handlePromptChange = (group, index, value) => {
    const newPrompts = {
      ...prompts,
      [category]: {
        ...prompts[category],
        [group]: prompts[category][group].map((item, i) =>
          i === index ? value : item
        ),
      },
    };
    setPrompts(newPrompts);
  };

  const handlePromptDelete = (group, index) => {
    const newPrompts = {
      ...prompts,
      [category]: {
        ...prompts[category],
        [group]: prompts[category][group].filter((_, i) => i !== index),
      },
    };
    setPrompts(newPrompts);
  };

  const handleAddPrompt = (e) => {
    e.preventDefault();
    if (newPromptText.trim() === "") return;
    const targetGroup = newPromptGroup || Object.keys(prompts[category])[0];
    const newPrompts = {
      ...prompts,
      [category]: {
        ...prompts[category],
        [targetGroup]: [
          ...(prompts[category][targetGroup] || []),
          newPromptText.trim(),
        ],
      },
    };
    setPrompts(newPrompts);
    setNewPromptText("");
  };

  useEffect(() => {
    if (prompts && prompts[category]) {
      setNewPromptGroup(Object.keys(prompts[category])[0]);
    }
  }, [category, prompts]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-lg mx-auto h-[80vh] flex flex-col p-0">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">Prompt Editor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon />
          </button>
        </div>
        <div className="flex border-b border-[var(--border-color)] mb-4 flex-shrink-0">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-transparent text-white p-2 focus:outline-none appearance-none"
          >
            <option className="bg-[var(--bg-secondary)]" value="truthPrompts">
              Truth
            </option>
            <option className="bg-[var(--bg-secondary)]" value="darePrompts">
              Dare
            </option>
            <option
              className="bg-[var(--bg-secondary)]"
              value="triviaQuestions"
            >
              Trivia
            </option>
            <option className="bg-[var(--bg-secondary)]" value="consequences">
              Consequences
            </option>
          </select>
        </div>
        <div className="flex-grow overflow-y-auto pr-2 space-y-6 text-left">
          {prompts &&
            prompts[category] &&
            Object.entries(prompts[category]).map(([group, list]) => (
              <div key={group}>
                <h3 className="text-lg font-semibold text-[var(--primary-accent)] capitalize mb-2 tracking-wider">
                  {group}
                </h3>
                <div className="space-y-2">
                  {list.map((prompt, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) =>
                          handlePromptChange(group, index, e.target.value)
                        }
                        className="w-full p-2 rounded-md bg-[var(--bg-main)] border border-[var(--border-color)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
                      />
                      <button
                        onClick={() => handlePromptDelete(group, index)}
                        className="text-pink-400 hover:text-pink-300 p-1"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
        <form
          onSubmit={handleAddPrompt}
          className="mt-4 flex-shrink-0 border-t border-[var(--border-color)] pt-4 space-y-3"
        >
          <h3 className="text-lg font-semibold text-[var(--primary-accent)] text-left">
            Add New Prompt
          </h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newPromptText}
              onChange={(e) => setNewPromptText(e.target.value)}
              placeholder="Type your new prompt..."
              className="w-full p-2 rounded-md bg-[var(--bg-main)] border border-[var(--border-color)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
            />
            {prompts &&
              prompts[category] &&
              Object.keys(prompts[category]).length > 1 && (
                <select
                  value={newPromptGroup}
                  onChange={(e) => setNewPromptGroup(e.target.value)}
                  className="bg-[var(--bg-main)] border border-[var(--border-color)] text-white p-2 rounded-md focus:outline-none capitalize"
                >
                  {Object.keys(prompts[category]).map((group) => (
                    <option key={group} value={group} className="capitalize">
                      {group}
                    </option>
                  ))}
                </select>
              )}
          </div>
          <button
            type="submit"
            className="modal-button bg-[var(--primary-accent)]/80 hover:bg-[var(--primary-accent)] border-transparent w-full"
          >
            <PlusIcon /> Add Prompt
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default EditorModal;
