import { memo } from "react";
import Modal from "./Modal";

const ConsequenceModal = memo(({ isOpen, onClose, content }) => (
  <Modal
    title="Consequence!"
    isOpen={isOpen}
    onClose={onClose}
    buttons={[
      {
        label: 'Accept',
        onClick: onClose,
        style: 'bg-orange-500 text-white shadow-md hover:bg-orange-600',
        sound: 'giggle',
        haptic: 'heavy',
      },
    ]}
  >
    <p>{content}</p>
  </Modal>
));

export default ConsequenceModal;
