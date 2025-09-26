import React, { memo } from "react";

const SparkMeter = memo(({ value }) => (
  <div
    className="meter"
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={value}
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
        className={`meter-fill ${value > 0 && value < 100 ? "pulsing" : ""}`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
));

SparkMeter.displayName = "SparkMeter";

export default SparkMeter;
