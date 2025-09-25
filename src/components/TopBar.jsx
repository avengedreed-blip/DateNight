import React, { memo, useCallback } from 'react';
import './TopBar.css'; // NEW glass style import

const TopBar = memo(({ onSettingsClick }) => {
  const handleSettingsClick = useCallback(() => {
    if (onSettingsClick) {
      onSettingsClick();
    }
  }, [onSettingsClick]);

  return (
    <header className="top-bar glass fixed top-0 left-0 w-full z-40 h-16 px-4 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <svg
          className="h-8 w-8 text-theme-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h1 className="text-xl font-bold text-theme-text tracking-wide">
          Date Night
        </h1>
      </div>

      <button
        onClick={handleSettingsClick}
        aria-label="Settings"
        data-sound="click"
        data-haptic="light"
        className="p-2 rounded-full transition-transform hover:scale-110 active:scale-95 duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary"
      >
        <svg
          className="h-6 w-6 text-theme-text"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.514.939 1.543 1.252 2.573 1.066z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </header>
  );
});

export default TopBar;
