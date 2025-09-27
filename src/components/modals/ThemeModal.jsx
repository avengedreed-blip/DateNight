import { memo } from "react";
import Modal from "./Modal";
import themes from "../../theme/themes";

const ThemeModal = memo(({ isOpen, onClose, onThemeChange }) => {
  const handleThemeChange = (themeName) => {
    onThemeChange(themeName);
    onClose();
  };

  return (
    <Modal title="Choose a Theme" isOpen={isOpen} onClose={onClose} buttons={[]}>
      <div className="grid grid-cols-2 gap-4">
        {Object.keys(themes).map((themeName) => (
          <button
            key={themeName}
            onClick={() => handleThemeChange(themeName)}
            data-sound="click"
            data-haptic="light"
            className="p-4 rounded-xl flex flex-col items-center justify-center text-center font-semibold transition-transform hover:scale-105 duration-200"
            style={{
              background: `linear-gradient(180deg, ${themes[themeName].bg[0]}, ${themes[themeName].bg[1]})`,
              color: themes[themeName].labels === 'white' ? 'white' : '#ccc',
              border: `2px solid ${themes[themeName].colors[0]}`,
            }}
          >
            {themeName
              .split('-')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </button>
        ))}
        <div className="p-4 rounded-xl flex flex-col items-center justify-center text-center font-semibold text-white/50 border-2 border-dashed border-white/20">
          Custom Theme (Coming Soon)
        </div>
      </div>
    </Modal>
  );
});

export default ThemeModal;
