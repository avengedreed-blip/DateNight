import React from 'react';

const ThemeModal = ({ isOpen, onClose, onThemeChange }) => {
  if (!isOpen) return null;

  const themes = [
    { id: 'classic-dark', label: 'Classic Dark' },
    { id: 'romantic-glow', label: 'Romantic Glow' },
    { id: 'playful-neon', label: 'Playful Neon' },
    { id: 'mystic-night', label: 'Mystic Night' },
  ];

  return (
    <div className="glass-modal fixed inset-0 flex items-center justify-center p-6">
      <div className="bg-black/75 text-white rounded-2xl p-6 max-w-md w-full space-y-4">
        <h2 className="text-2xl font-bold">Choose a Theme</h2>
        <ul className="space-y-2">
          {themes.map((theme) => (
            <li key={theme.id}>
              <button
                onClick={() => {
                  onThemeChange?.(theme.id);
                  onClose?.();
                }}
                className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-left"
              >
                {theme.label}
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 rounded-full bg-pink-600 hover:bg-pink-500 text-white font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ThemeModal;
