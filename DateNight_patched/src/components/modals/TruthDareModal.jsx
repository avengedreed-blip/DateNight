import { memo } from "react";
import Modal from "./Modal";

const TruthDareModal = memo(({ isOpen, onClose, content, onAccept, onRefuse, timeoutMs = 30000 }) => {
  // Provide a default 30‑second timer for truth or dare prompts. When the timer
  // expires, the player is considered to have refused the prompt and the
  // modal will automatically close. We pass timeoutMs and onTimeout to
  // the underlying Modal component to enable the countdown overlay.
  return (
    <Modal
      title="Truth or Dare?"
      isOpen={isOpen}
      onClose={onClose}
      timeoutMs={timeoutMs}
      onTimeout={() => {
        // Treat a timeout like a refusal: trigger the provided onRefuse
        // callback when available, otherwise fall back to closing the modal.
        if (typeof onRefuse === 'function') {
          onRefuse();
        } else if (typeof onClose === 'function') {
          onClose();
        }
      }}
      buttons={[
        {
          label: 'Accept',
          onClick: () => {
            if (typeof onAccept === 'function') {
              onAccept();
            } else if (typeof onClose === 'function') {
              onClose();
            }
          },
          style: 'bg-green-500 text-white shadow-md hover:bg-green-600',
          sound: 'woo',
          haptic: 'medium',
        },
        {
          label: 'Refuse',
          onClick: () => {
            if (typeof onRefuse === 'function') {
              onRefuse();
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

export default TruthDareModal;
