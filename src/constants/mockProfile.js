const mockProfile = {
  username: "Player1",
  achievements: [
    {
      id: "first_spin",
      title: "Spin Cycle",
      description: "Completed your first spin.",
      unlocked: true,
      icon: "🌀",
    },
    {
      id: "dare_devil",
      title: "Dare Devil",
      description: "Completed 5 Dares.",
      unlocked: true,
      icon: "🔥",
    },
    {
      id: "quiz_master",
      title: "Quiz Master",
      description: "Answered 10 Trivia questions correctly.",
      unlocked: true,
      icon: "🧠",
    },
    {
      id: "high_roller",
      title: "High Roller",
      description: "Reached the Extreme Round.",
      unlocked: true,
      icon: "💥",
    },
    {
      id: "theme_master",
      title: "Stylist",
      description: "Tried all themes.",
      unlocked: true,
      icon: "🎨",
    },
    {
      id: "locked_1",
      title: "???",
      description: "Keep playing to unlock.",
      unlocked: false,
      icon: "❓",
    },
  ],
};

export default mockProfile;
export { mockProfile };
