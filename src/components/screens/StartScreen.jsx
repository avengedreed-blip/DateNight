import React from "react";

const MODE_OPTIONS = [
  { value: "single-device", label: "Single Device" },
  { value: "multiplayer", label: "Multiplayer" },
  { value: "offline", label: "Offline" },
  { value: "party", label: "Party" },
];

const MODE_LABELS = MODE_OPTIONS.reduce((map, option) => {
  map[option.value] = option.label;
  return map;
}, {});

const StartScreen = ({
  createNewGame,
  joinGame,
  inputGameId,
  setInputGameId,
  resetInputGameId,
  gameMode,
  onSelectMode,
  onButtonClick: handleButtonClick,
}) => {
  const wrapWithFeedback = (callback) => () => {
    if (handleButtonClick) {
      handleButtonClick();
    }
    callback();
  };

  const handleCreateNewGame = wrapWithFeedback(createNewGame);
  const handleResetGameCode = wrapWithFeedback(
    resetInputGameId ?? (() => setInputGameId(""))
  );

  const handleJoinGame = (event) => {
    if (handleButtonClick) {
      handleButtonClick();
    }
    joinGame(event);
  };

  const handleModeSelect = (mode) => {
    if (handleButtonClick) {
      handleButtonClick();
    }

    const label = MODE_LABELS[mode] ?? mode;

    if (onSelectMode) {
      onSelectMode(mode);
    }

    if (mode === "single-device" && typeof createNewGame === "function") {
      console.info("Single Device mode selected");
      createNewGame();
    } else {
      console.info(`Selected mode: ${label}`);
    }
  };

  const selectedModeLabel = MODE_LABELS[gameMode] ?? MODE_OPTIONS[0].label;

  return (
    <div className="start-screen">
      <main className="start-panel">
        <h1 className="start-panel__title">Date Night</h1>
        <p className="start-panel__text">
          Spin the wheel, challenge each other, and keep the evening playful.
        </p>
        <div
          className="start-panel__mode-selector"
          role="group"
          aria-label="Select game mode"
        >
          {MODE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`mode-button${
                gameMode === value ? " mode-button--active" : ""
              }`}
              aria-pressed={gameMode === value}
              onClick={() => handleModeSelect(value)}
            >
              <span className="mode-button__label">{label}</span>
            </button>
          ))}
        </div>
        <p className="start-panel__mode-hint">
          Mode selected: <span>{selectedModeLabel}</span>
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
