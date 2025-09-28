import { memo, useId } from "react";
import "./SparkMeter.css";

const SparkMeter = memo(({ value = 0, theme, label = "Spark" }) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const clampedValue = Math.min(100, Math.max(0, safeValue));
  const isHigh = clampedValue > 80;

  const themeClass = theme ? `theme-${theme}` : "";
  const id = useId();
  const labelId = `spark-meter-label-${id}`;

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
          style={{ width: `${clampedValue}%` }}
          data-high={isHigh}
        />
      </div>
    </div>
  );
});

export default SparkMeter;
