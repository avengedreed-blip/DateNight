const StartScreen = ({ onStartGame }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-6">
      <h1 className="text-4xl font-bold text-white drop-shadow-lg">Date Night Spin</h1>
      <p className="text-lg text-white/80 max-w-md">
        Gather your friends, tap a mode, and let the wheel decide the next thrill!
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => onStartGame('classic')}
          className="px-6 py-3 rounded-full bg-teal-500 hover:bg-teal-400 text-white font-semibold transition-colors"
        >
          Classic Play
        </button>
        <button
          onClick={() => onStartGame('extreme')}
          className="px-6 py-3 rounded-full bg-pink-600 hover:bg-pink-500 text-white font-semibold transition-colors"
        >
          Extreme Mode
        </button>
      </div>
    </div>
  );
};

export default StartScreen;
