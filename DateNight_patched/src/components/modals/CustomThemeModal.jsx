import { useState, memo } from 'react';
import Modal from './Modal';

/**
 * A modal that allows users to define a custom theme. Users can input
 * hexadecimal color values for the background gradient and each prompt
 * category, as well as a music track ID. When the user clicks Save,
 * a theme object is constructed and passed to the onSave callback. The
 * caller is responsible for storing the theme and updating the available
 * themes list.
 */
const CustomThemeModal = memo(({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [bg1, setBg1] = useState('#0D121B');
  const [bg2, setBg2] = useState('#0A0E14');
  const [truthColor, setTruthColor] = useState('#00E6D0');
  const [dareColor, setDareColor] = useState('#FF477E');
  const [triviaColor, setTriviaColor] = useState('#7AA2FF');
  const [consequenceColor, setConsequenceColor] = useState('#FFD166');
  const [trackId, setTrackId] = useState('custom_track');

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      // Require a name to identify the theme
      return;
    }
    const id = `custom-${Date.now()}`;
    const newTheme = {
      id,
      name: trimmedName,
      bg: [bg1, bg2],
      colors: {
        truth: truthColor,
        dare: dareColor,
        trivia: triviaColor,
        consequence: consequenceColor,
      },
      label: 'white',
      particles: {
        type: 'custom',
        color: truthColor,
      },
      meter: [truthColor, triviaColor],
      trackId,
    };
    if (typeof onSave === 'function') {
      onSave(newTheme);
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <Modal
      title="Custom Theme Builder"
      isOpen={isOpen}
      onClose={onClose}
      buttons={[
        {
          label: 'Save',
          onClick: handleSave,
          style: 'bg-teal-600 text-white hover:bg-teal-500',
          sound: 'woo',
          haptic: 'medium',
        },
        {
          label: 'Cancel',
          onClick: onClose,
          style: 'bg-gray-600 text-white hover:bg-gray-500',
          sound: 'click',
          haptic: 'light',
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col text-left">
          <span className="font-semibold mb-1">Theme Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-2 rounded-md bg-gray-800 text-white"
            placeholder="e.g. Sunset Glow"
          />
        </label>
        <label className="flex flex-col text-left">
          <span className="font-semibold mb-1">Background Gradient Start</span>
          <input
            type="text"
            value={bg1}
            onChange={(e) => setBg1(e.target.value)}
            className="p-2 rounded-md bg-gray-800 text-white"
            placeholder="#0D121B"
          />
        </label>
        <label className="flex flex-col text-left">
          <span className="font-semibold mb-1">Background Gradient End</span>
          <input
            type="text"
            value={bg2}
            onChange={(e) => setBg2(e.target.value)}
            className="p-2 rounded-md bg-gray-800 text-white"
            placeholder="#0A0E14"
          />
        </label>
        <label className="flex flex-col text-left">
          <span className="font-semibold mb-1">Truth Color</span>
          <input
            type="text"
            value={truthColor}
            onChange={(e) => setTruthColor(e.target.value)}
            className="p-2 rounded-md bg-gray-800 text-white"
            placeholder="#00E6D0"
          />
        </label>
        <label className="flex flex-col text-left">
          <span className="font-semibold mb-1">Dare Color</span>
          <input
            type="text"
            value={dareColor}
            onChange={(e) => setDareColor(e.target.value)}
            className="p-2 rounded-md bg-gray-800 text-white"
            placeholder="#FF477E"
          />
        </label>
        <label className="flex flex-col text-left">
          <span className="font-semibold mb-1">Trivia Color</span>
          <input
            type="text"
            value={triviaColor}
            onChange={(e) => setTriviaColor(e.target.value)}
            className="p-2 rounded-md bg-gray-800 text-white"
            placeholder="#7AA2FF"
          />
        </label>
        <label className="flex flex-col text-left">
          <span className="font-semibold mb-1">Consequence Color</span>
          <input
            type="text"
            value={consequenceColor}
            onChange={(e) => setConsequenceColor(e.target.value)}
            className="p-2 rounded-md bg-gray-800 text-white"
            placeholder="#FFD166"
          />
        </label>
        <label className="flex flex-col text-left">
          <span className="font-semibold mb-1">Music Track ID</span>
          <input
            type="text"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            className="p-2 rounded-md bg-gray-800 text-white"
            placeholder="custom_track"
          />
        </label>
      </div>
    </Modal>
  );
});

export default CustomThemeModal;