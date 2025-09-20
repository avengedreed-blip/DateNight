import React from "react";

const Wheel = ({ rotation, isExtremeRound }) => {
  const wheelSlices = ["TRUTH", "DARE", "TRIVIA"];
  return (
    <div className="wheel-container">
      <div
        className={`wheel ${isExtremeRound ? "extreme" : ""}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {wheelSlices.map((slice, index) => (
          <div
            key={slice}
            className="wheel-label"
            style={{ transform: `rotate(${index * 120 + 60}deg)` }}
          >
            <span>{slice}</span>
          </div>
        ))}
      </div>
      <div className={`pointer ${isExtremeRound ? "extreme" : ""}`}>▼</div>
    </div>
  );
};

export default Wheel;
