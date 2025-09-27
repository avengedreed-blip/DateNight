import { memo, useEffect } from "react";
import confetti from "canvas-confetti";
import Modal from "./Modal";

const ExtremeRoundModal = memo(({ isOpen, onClose, content }) => {
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [isOpen]);

  return (
    <Modal
      title="🔥 Extreme Round! 🔥"
      isOpen={isOpen}
      onClose={onClose}
      buttons={[
        {
          label: "Let's Go!",
          onClick: onClose,
          style:
            'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md hover:from-teal-400 hover:to-cyan-500',
          sound: 'fanfare',
          haptic: 'medium',
        },
        {
          label: 'Not Yet',
          onClick: onClose,
          style: 'bg-gray-600 text-white hover:bg-gray-500',
          sound: 'boo',
          haptic: 'light',
        },
      ]}
    >
      <p className="font-bold text-lg text-theme-text">{content}</p>
    </Modal>
  );
});

export default ExtremeRoundModal;

