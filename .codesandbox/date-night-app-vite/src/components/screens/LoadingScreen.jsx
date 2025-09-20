import React from "react";

const LoadingScreen = ({ message }) => (
  <div className="min-h-screen font-sans flex flex-col items-center justify-center p-4">
    <main className="w-full max-w-sm mx-auto rounded-2xl shadow-2xl p-8 text-center bg-[var(--bg-secondary)] border border-[var(--border-color)]">
      <h1 className="text-3xl font-bold mb-4 animate-pulse text-shadow">
        {message}
      </h1>
      <p className="text-[var(--text-secondary)]">
        Getting things ready for date night!
      </p>
    </main>
  </div>
);

export default LoadingScreen;
