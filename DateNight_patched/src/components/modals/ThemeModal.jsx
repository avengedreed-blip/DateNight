import { memo } from "react";
import Modal from "./Modal";
import themes from "../../theme/themes";

const ThemeModal = memo(({
  isOpen,
  onClose,
  onThemeChange,
  customThemes = [],
  onCreateCustomTheme,
}) => {
  const handleThemeChange = (themeName) => {
    if (typeof onThemeChange === 'function') {
      onThemeChange(themeName);
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  // Merge built-in themes with any custom themes provided via props. Custom
  // themes should be an array of objects with id, name, bg and colors.
  const combined = { ...themes };
  customThemes.forEach((t) => {
    if (t && t.id) {
      combined[t.id] = {
        bg: t.bg,
        colors: [t.colors.truth, t.colors.dare, t.colors.trivia, t.colors.consequence],
        labels: 'white',
      };
    }
  });

  return (
    <Modal title="Choose a Theme" isOpen={isOpen} onClose={onClose} buttons={[]}>
      <div className="grid grid-cols-2 gap-4">
        {Object.keys(combined).map((themeName) => {
          const t = combined[themeName];
          return (
            <button
              key={themeName}
              onClick={() => handleThemeChange(themeName)}
              data-sound="click"
              data-haptic="light"
              className="p-4 rounded-xl flex flex-col items-center justify-center text-center font-semibold transition-transform hover:scale-105 duration-200"
              style={{
                background: `linear-gradient(180deg, ${t.bg[0]}, ${t.bg[1]})`,
                color: t.labels === 'white' ? 'white' : '#ccc',
                border: `2px solid ${t.colors[0]}`,
              }}
            >
              {themeName
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </button>
          );
        })}
        {typeof onCreateCustomTheme === 'function' && (
          <button
            onClick={onCreateCustomTheme}
            data-sound="click"
            data-haptic="light"
            className="p-4 rounded-xl flex flex-col items-center justify-center text-center font-semibold text-white/50 border-2 border-dashed border-white/20 hover:text-white hover:border-white/40"
          >
            Create Custom Theme
          </button>
        )}
      </div>
    </Modal>
  );
});

export default ThemeModal;
