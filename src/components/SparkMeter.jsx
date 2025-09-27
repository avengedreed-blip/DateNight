import { memo } from "react";

const SparkMeter = memo(({ value }) => {
  const numericValue = Number.isFinite(value) ? value : 0;
  const clampedValue = Math.min(100, Math.max(0, numericValue));

  return (
    <div
      className="meter"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampedValue}
    >
      <div
        style={{
          textAlign: "center",
          fontWeight: 800,
          letterSpacing: ".14em",
          fontSize: 12,
          opacity: 0.85,
          marginBottom: 8,
        }}
      >
        SPARK METER
      </div>
      <div className="meter-track">
        <div
          className={`meter-fill ${
            clampedValue > 0 && clampedValue < 100 ? "pulsing" : ""
          }`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
});

SparkMeter.displayName = "SparkMeter";

export default SparkMeter;
