import { memo } from "react";
import Modal from "./Modal";

const TruthDareModal = memo(({ isOpen, onClose, content }) => (
  <Modal
    title="Truth or Dare?"
    isOpen={isOpen}
    onClose={onClose}
    buttons={[
      {
        label: 'Accept',
        onClick: onClose,
        style: 'bg-green-500 text-white shadow-md hover:bg-green-600',
        sound: 'woo',
        haptic: 'medium',
      },
      {
        label: 'Refuse',
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

export default TruthDareModal;
