import React from "react";

const StartScreen = ({
  createNewGame,
  joinGame,
  inputGameId,
  setInputGameId,
  resetInputGameId,
  onButtonClick,
}) => {
  const handleButtonClick = (callback) => () => {
    if (onButtonClick) {
      onButtonClick();
    }
    callback();
  };

  const handleCreateNewGame = handleButtonClick(createNewGame);
  const handleResetGameCode = handleButtonClick(
    resetInputGameId ?? (() => setInputGameId(""))
  );

  const handleJoinGame = (event) => {
    if (onButtonClick) {
      onButtonClick();
    }
    joinGame(event);
  };

  return (
    <div className="start-screen">
      <main className="start-panel">
        <h1 className="start-panel__title">Date Night</h1>
        <p className="start-panel__text">
          Spin the wheel, challenge each other, and keep the evening playful.
        </p>
        <div className="start-panel__actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleCreateNewGame}
          >
            Create New Game
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleResetGameCode}
          >
            Reset Game Code
          </button>
        </div>
        <form className="start-panel__form" onSubmit={handleJoinGame}>
          <label className="sr-only" htmlFor="game-code">
            Enter a six-character game code
          </label>
          <input
            id="game-code"
            className="input input--center"
            type="text"
            value={inputGameId}
            onChange={(event) =>
              setInputGameId(event.target.value.toUpperCase())
            }
            placeholder="ENTER GAME ID"
            autoComplete="off"
            maxLength={8}
            inputMode="text"
          />
          <button type="submit" className="ghost-button">
            Join Game
          </button>
        </form>
      </main>
    </div>
  );
};

export default StartScreen;
