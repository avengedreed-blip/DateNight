import { useEffect, useState } from "react";

/*
 * Simple achievements hook. Tracks rounds completed, consecutive correct
 * answers, and consecutive refusals, unlocking badges when thresholds are
 * reached. Achievements persist to localStorage across sessions using the
 * provided storage key. The returned `registerRound` function should be
 * called after every round with flags indicating whether the round was
 * answered correctly or refused. Additional badges can be added by
 * extending the ACHIEVEMENT_DEFINITIONS array.
 */

const STORAGE_KEY = "dn_achievements";

// Define the available achievements. Each entry has an id, icon, title,
// description and an `unlock` function that determines whether the
// achievement should unlock based on the current stats. Icons use
// standard emoji for simplicity; these could be replaced with SVGs.
const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "bronze",
    icon: "🥉",
    title: "Bronze Badge",
    description: "Complete 5 rounds",
    unlock: (stats) => stats.rounds >= 5,
  },
  {
    id: "silver",
    icon: "🥈",
    title: "Silver Badge",
    description: "Complete 15 rounds",
    unlock: (stats) => stats.rounds >= 15,
  },
  {
    id: "gold",
    icon: "🥇",
    title: "Gold Badge",
    description: "Complete 30 rounds",
    unlock: (stats) => stats.rounds >= 30,
  },
  {
    id: "platinum",
    icon: "🏆",
    title: "Platinum Trophy",
    description: "Complete 50 rounds",
    unlock: (stats) => stats.rounds >= 50,
  },
  {
    id: "streak-master",
    icon: "🔥",
    title: "Streak Master",
    description: "Answer 5 questions in a row correctly",
    unlock: (stats) => stats.correctStreak >= 5,
  },
  {
    id: "coward-penalty",
    icon: "🐔",
    title: "Coward Penalty",
    description: "Refuse 3 prompts in a row",
    unlock: (stats) => stats.refusalStreak >= 3,
  },
];

export default function useAchievements() {
  // Stats for tracking progress through the session. These are reset when a
  // new game starts. The caller can manage resets by re-creating the hook.
  // In addition to total rounds and current streaks, we record the number of
  // correctly answered rounds and the number of refusals.  These counts
  // enable the stats dashboard in the settings modal.
  const [stats, setStats] = useState({
    rounds: 0,
    correctStreak: 0,
    refusalStreak: 0,
    correctCount: 0,
    refusalCount: 0,
  });

  // Load persisted achievements from localStorage or initialise to the
  // default (all locked). Each achievement is represented as
  // { id, icon, title, description, unlocked }
  const [achievements, setAchievements] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        // Merge stored unlock states with definitions
        return ACHIEVEMENT_DEFINITIONS.map((def) => ({
          ...def,
          unlocked: Boolean(stored[def.id]),
        }));
      } catch {
        // Fall through to default if parsing fails
      }
    }
    return ACHIEVEMENT_DEFINITIONS.map((def) => ({ ...def, unlocked: false }));
  });

  // Persist unlock state whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const state = achievements.reduce((acc, ach) => {
        acc[ach.id] = ach.unlocked;
        return acc;
      }, {});
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Failed to persist achievements", err);
    }
  }, [achievements]);

  // Call this after each round completes. Provide flags for whether the
  // round was answered correctly and whether it was refused. A round can be
  // neither correct nor refused (e.g. the timer expired), in which case both
  // flags should be false.
  function registerRound({ wasCorrect = false, wasRefusal = false } = {}) {
    setStats((prev) => {
      return {
        rounds: prev.rounds + 1,
        correctStreak: wasCorrect ? prev.correctStreak + 1 : 0,
        refusalStreak: wasRefusal ? prev.refusalStreak + 1 : 0,
        correctCount: wasCorrect ? prev.correctCount + 1 : prev.correctCount,
        refusalCount: wasRefusal ? prev.refusalCount + 1 : prev.refusalCount,
      };
    });
  }

  // Whenever stats update, check for new achievements to unlock
  useEffect(() => {
    setAchievements((prev) => {
      let changed = false;
      const next = prev.map((ach) => {
        if (!ach.unlocked && ach.unlock(stats)) {
          changed = true;
          return { ...ach, unlocked: true };
        }
        return ach;
      });
      return changed ? next : prev;
    });
  }, [stats]);

  // Expose stats for informational purposes and the achievement list
  return { achievements, stats, registerRound };
}