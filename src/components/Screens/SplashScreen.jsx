const SplashScreen = () => (
  <div
    className="glass animate-in"
    style={{
      padding: "3rem clamp(2rem, 6vw, 4rem)",
      borderRadius: 28,
      textAlign: "center",
      maxWidth: "min(90vw, 520px)",
    }}
  >
    <h1 className="brand-title" style={{ fontSize: "clamp(2.5rem, 6vw, 3.4rem)", margin: 0 }}>
      Date Night
    </h1>
    <p style={{ margin: "1rem 0 0", fontSize: "clamp(1rem, 2.2vw, 1.3rem)", opacity: 0.85 }}>
      Spinning up unforgettable memories...
    </p>
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: "50%",
        margin: "2rem auto 0",
        border: "4px solid rgba(255,255,255,0.25)",
        borderTopColor: "var(--theme-primary)",
        animation: "splash-spin 1s linear infinite",
      }}
    />
  </div>
);

export default SplashScreen;
