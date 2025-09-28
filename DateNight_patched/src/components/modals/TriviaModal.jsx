import { memo } from "react";
import Modal from "./Modal";

const TriviaModal = memo(({
  isOpen,
  onClose,
  content,
  onCorrect,
  onIncorrect,
  timeoutMs = 30000,
}) => {
  // In trivia mode there is also a countdown timer. If the timer expires
  // without an answer, the player is considered incorrect. We pass
  // timeoutMs and onTimeout to the underlying Modal. A longer or shorter
  // timeout can be provided externally (e.g. for multiplayer sync).
  return (
    <Modal
      title="Trivia Time!"
      isOpen={isOpen}
      onClose={onClose}
      timeoutMs={timeoutMs}
      onTimeout={() => {
        // Treat a timeout like an incorrect answer: invoke the
        // provided onIncorrect callback when available, otherwise fall
        // back to closing the modal.
        if (typeof onIncorrect === 'function') {
          onIncorrect();
        } else if (typeof onClose === 'function') {
          onClose();
        }
      }}
      buttons={[
        {
          label: 'Correct',
          onClick: () => {
            if (typeof onCorrect === 'function') {
              onCorrect();
            } else if (typeof onClose === 'function') {
              onClose();
            }
          },
          style: 'bg-green-500 text-white shadow-md hover:bg-green-600',
          sound: 'click',
          haptic: 'medium',
        },
        {
          label: 'Incorrect',
          onClick: () => {
            if (typeof onIncorrect === 'function') {
              onIncorrect();
            } else if (typeof onClose === 'function') {
              onClose();
            }
          },
          style: 'bg-red-500 text-white shadow-md hover:bg-red-600',
          sound: 'boo',
          haptic: 'heavy',
        },
      ]}
    >
      <p>{content}</p>
    </Modal>
  );
});

export default TriviaModal;
