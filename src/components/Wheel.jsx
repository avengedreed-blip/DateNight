import React, { memo, useCallback, useMemo } from 'react';
import './Wheel.css';

// Helper function to calculate luminance... (Luminance function remains unchanged)
const getLuminance = (hex) => {
  if (!hex || hex.length < 7) return 1;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};

const Wheel = memo(({ slices = [] }) => {
  if (!Array.isArray(slices) || slices.length === 0) {
    console.error("The 'slices' prop is not a valid array, or is empty.");
    return null;
  }
  
  const totalSlices = slices.length;
  const sliceAngle = 360 / totalSlices;
  
  const wheelStyle = useMemo(() => {
    let gradient = 'conic-gradient(';
    slices.forEach((slice, index) => {
      const color = slice.color; 
      const start = (100 / totalSlices) * index;
      const end = start + (100 / totalSlices);
      gradient += `${color} ${start}% ${end}%${index < totalSlices - 1 ? ', ' : ''}`;
    });
    gradient += ')';
    
    const gloss = `radial-gradient(120% 120% at 35% 25%, rgba(255,255,255,.10), rgba(0,0,0,.20) 70%)`;
    
    return {
      backgroundImage: `${gradient}, ${gloss}`,
      willChange: 'transform',
    };
  }, [slices, totalSlices]);
  
  const getLabelTransform = useCallback((index) => {
    const bisectorAngle = (index * sliceAngle) + (sliceAngle / 2);
    return {
      transform: `rotate(${bisectorAngle}deg) translateY(calc(-1 * var(--labelRadius))) rotate(${-bisectorAngle}deg)`,
    };
  }, [sliceAngle]);

  return (
    <div className="wheel-container relative flex items-center justify-center">
      {/* Pointer uses CSS variable for ring color */}
      <div 
        className="wheel-pointer absolute top-0 left-1/2 -translate-x-1/2 z-50"
        style={{ borderBottomColor: 'var(--ring-color, #fff)' }} 
      ></div>

      <div 
        className="wheel relative w-full h-full rounded-full overflow-hidden"
        style={wheelStyle}
      >
        {slices.map((slice, index) => {
          const isDark = getLuminance(slice.rawColor) < 0.5;
          
          return (
            <div
              key={index}
              className="absolute inset-0 flex justify-center items-center text-white text-center"
            >
              <div
                className="wheel-label w-1/2 whitespace-normal"
                style={getLabelTransform(index)}
              >
                <p 
                  className={`wheel-label-text font-semibold ${isDark ? 'has-shadow' : ''}`}
                >
                  {slice.label}
                </p>
              </div>
            </div>
          );
        })}
        
        {/* Render Separators */}
        {slices.map((_, index) => (
          <div
            key={`separator-${index}`}
            className="wheel-separator"
            style={{ transform: `rotate(${index * sliceAngle}deg)` }}
          />
        ))}

      </div>
    </div>
  );
});

export default Wheel;
