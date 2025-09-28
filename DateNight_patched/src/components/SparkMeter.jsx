import { memo, useId } from "react";
import "./SparkMeter.css";

const SparkMeter = memo(({ value = 0, theme, label = "Spark" }) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const clampedValue = Math.min(100, Math.max(0, safeValue));
  const isHigh = clampedValue > 80;

  const themeClass = theme ? `theme-${theme}` : "";
  const id = useId();
  const labelId = `spark-meter-label-${id}`;

  // Compute a pulse duration that decreases as the meter fills.  When the
  // meter is empty (0%), the pulse is slow (2.5s).  When the meter is full
  // (100%), the pulse is fast (0.5s).  See SparkMeter.css for how this
  // variable controls the glow animation.  Values outside 0–100 are
  // clamped above.
  const pulseDuration = 2.5 - (clampedValue / 100) * 2.0;

  return (
    <div
      className={`spark-meter ${themeClass}`.trim()}
      data-testid="spark-meter"
      data-theme={theme || "default"}
    >
      <div className="spark-meter-header">
        <div id={labelId} className="spark-meter-label">
          {label}
        </div>
        <div className="spark-meter-value">{Math.round(clampedValue)}%</div>
      </div>
      <div
        className="spark-meter-bar"
        role="meter"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${Math.round(clampedValue)}%`}
        aria-labelledby={labelId}
      >
        <div
          className="spark-meter-fill"
          style={{
            width: `${clampedValue}%`,
            // Expose the pulse duration as a CSS variable.  It will be
            // consumed by the ::after pseudo-element in CSS to control the
            // animation speed.
            '--pulse-duration': `${pulseDuration}s`,
          }}
          data-high={isHigh}
        />
      </div>
    </div>
  );
});

export default SparkMeter;
