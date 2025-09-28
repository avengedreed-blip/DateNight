import { memo, useCallback } from "react";
import "./BottomNav.css"; // Glass style import

// Icon placeholders (use simple emoji for now; can be swapped later if needed)
const ModesIcon = () => <span className="text-xl">🎲</span>;
const ThemesIcon = () => <span className="text-xl">🎨</span>;
const HelpIcon = () => <span className="text-xl">❓</span>;

const navItems = [
  { label: "Modes", icon: ModesIcon },
  { label: "Themes", icon: ThemesIcon },
  { label: "Help", icon: HelpIcon },
];

const BottomNav = memo(({ onNavigate }) => {
  const handleNavigation = useCallback((item) => {
    if (onNavigate) {
      onNavigate(item.label);
    }
  }, [onNavigate]);

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 w-full z-40 p-2">
      <div className="glass flex justify-around items-center h-20 rounded-xl px-2 py-1 max-w-lg mx-auto">
        {navItems.map((item) => (
          <button
            key={item.label}
            className="flex flex-col items-center text-center text-theme-text-light font-medium transition-transform duration-200 active:scale-[0.95] hover:scale-[1.05] focus:outline-none"
            onClick={() => handleNavigation(item)}
            aria-label={`Go to ${item.label} screen`}
            data-sound="click"
            data-haptic="light"
          >
            <item.icon />
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
});

export default BottomNav;
