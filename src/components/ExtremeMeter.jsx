import React, { memo } from 'react';

const ExtremeMeter = memo(({ fillLevel, meterName, onExtremeTrigger }) => {
  const isFull = fillLevel >= 100;
  const fillPercentage = `${fillLevel}%`;

  // Determine animation/glow intensity based on fill level
  let glowClass = '';
  if (fillLevel > 95) {
    glowClass = 'glow-full pulse-strong';
    // NOTE TO CODEX: Trigger heavy haptic here: data-haptic="heavy"
  } else if (fillLevel >= 50) {
    glowClass = 'pulse-subtle';
    // NOTE TO CODEX: Trigger light/medium haptic here: data-haptic="light"
  }

  // NOTE TO CODEX: This line provides the modal trigger logic when full.
  React.useEffect(() => {
    if (isFull) {
      onExtremeTrigger();
    }
  }, [isFull, onExtremeTrigger]);

  return (
    <div 
      className="w-full max-w-xs mx-auto my-4 text-center"
      role="progressbar"
      aria-valuenow={fillLevel}
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <h3 className="text-sm font-bold text-white mb-2">{meterName}</h3>
      <div className="relative w-full h-4 rounded-full overflow-hidden bg-[var(--meter-bg)] shadow-inner">
        <div
          className={`spark-meter-fill h-full rounded-full transition-all duration-300 ${glowClass}`}
          style={{ width: fillPercentage, transition: 'width 500ms ease-out, box-shadow 300ms ease-in-out' }}
        ></div>
      </div>
      {isFull && <p className="text-xs text-red-400 mt-1 animate-pulse">EXTREME ROUND READY!</p>}
    </div>
  );
});

export default ExtremeMeter;
