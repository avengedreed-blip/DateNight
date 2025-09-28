import { memo } from "react";

const SplashScreen = memo(() => (
  <div
    className="screen enter"
    style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <h1
      className="brand-title animate-in"
      style={{
        fontSize: "clamp(3rem, 10vw, 6rem)",
        color: "var(--ring)",
      }}
    >
      Date Night
    </h1>
    <p
      className="animate-in delay-1"
      style={{ color: "var(--text-weak)", fontSize: "1.25rem" }}
    >
      Loading the fun...
    </p>
  </div>
));

export default SplashScreen;
