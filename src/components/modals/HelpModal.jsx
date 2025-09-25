import React, { memo } from 'react';
import Modal from './Modal';

const HelpModal = memo(({ isOpen, onClose }) => (
  <Modal
    title="How to Play"
    isOpen={isOpen}
    onClose={onClose}
    buttons={[
      {
        label: 'Got It!',
        onClick: onClose,
        style: 'bg-white/90 text-gray-900 shadow-md hover:bg-white/70',
        sound: 'click',
        haptic: 'medium',
      },
    ]}
  >
    <p>
      The Date Night App is a collection of fun, ice-breaking games for you and
      your partner. Simply spin the wheel and let fate decide your next activity!
    </p>
    <p className="mt-4 font-bold">Wheel Slices:</p>
    <ul className="list-disc list-inside space-y-2 mt-2">
      <li><strong>Truth:</strong> Answer a deep or funny question.</li>
      <li><strong>Dare:</strong> Perform a playful or embarrassing task.</li>
      <li><strong>Trivia:</strong> Test your knowledge of your partner.</li>
      <li><strong>Consequence:</strong> The losing player must perform a task.</li>
    </ul>
    <p className="mt-4">
      The Spark Meter tracks your game's intensity. When it fills up, get ready
      for a special "Extreme Round!"
    </p>
  </Modal>
));

export default HelpModal;
