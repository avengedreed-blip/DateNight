import React from 'react';

const StartScreen = ({ createNewGame, joinGame, inputGameId, setInputGameId }) => (
  <div className="min-h-screen font-sans flex flex-col items-center justify-center p-4">
    <main className="w-full max-w-sm mx-auto rounded-2xl shadow-2xl p-8 text-center bg-[var(--bg-secondary)] border border-[var(--border-color)]">
      <h1 className="text-3xl font-bold mb-4 text-shadow">Date Night</h1>
      <p className="text-[var(--text-secondary)] mb-6">
        Create a game to share with your partner or join an existing one.
      </p>
      <button
        onClick={createNewGame}
        className="w-full bg-[var(--primary-accent)] hover:brightness-110 text-white font-bold py-3 px-4 rounded-lg mb-4 transition-all transform hover:scale-105 active:scale-95"
      >
        Create New Game
      </button>
      <form onSubmit={joinGame} className="flex flex-col">
        <input
          type="text"
          value={inputGameId}
          onChange={(e) => setInputGameId(e.target.value)}
          className="w-full p-3 rounded-md bg-[var(--bg-main)] border border-[var(--border-color)] text-white text-center uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)] mb-2"
          placeholder="ENTER GAME ID"
        />
        <button
          type="submit"
          className="w-full bg-black/20 hover:bg-black/40 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 active:scale-95"
        >
          Join Game
        </button>
      </form>
    </main>
  </div>
);

export default StartScreen;
