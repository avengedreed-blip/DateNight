import React, { memo } from 'react';
import Modal from './Modal';

const TriviaModal = memo(({ isOpen, onClose, content }) => (
  <Modal
    title="Trivia Time!"
    isOpen={isOpen}
    onClose={onClose}
    buttons={[
      {
        label: 'Right',
        onClick: onClose,
        style: 'bg-green-500 text-white shadow-md hover:bg-green-600',
        sound: 'click',
        haptic: 'medium',
      },
      {
        label: 'Wrong',
        onClick: onClose,
        style: 'bg-red-500 text-white shadow-md hover:bg-red-600',
        sound: 'boo',
        haptic: 'heavy',
      },
    ]}
  >
    <p>{content}</p>
  </Modal>
));

export default TriviaModal;
