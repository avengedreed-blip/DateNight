import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFirestoreModule } from "./utils/firestoreStub.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const profileModulePath = path.resolve(__dirname, "../src/firebase/profile.js");
const firebaseConfigPath = path.resolve(__dirname, "../src/firebase/config.js");

const importProfileModule = async (firestoreOptions = {}) => {
  vi.resetModules();
  const { db, module, state } = createFirestoreModule(firestoreOptions);
  vi.doMock(firebaseConfigPath, () => ({ db }));
  vi.doMock("firebase/firestore", () => module);
  const profileModule = await import(profileModulePath);
  return { profileModule, state, db };
};

describe("profile merging", () => {
  it("combines statistics, themes, and custom prompts across duplicates", async () => {
    const { profileModule, state } = await importProfileModule({
      initialDocs: {
        "players/player-1": {
          data: {
            username: "Taylor",
            avatar: "🎲",
            streaks: { current: 2, best: 4 },
            refusals: { truth: 1 },
            triviaStats: { correct: 3, incorrect: 1, streak: 2 },
            badges: ["bronze"],
            achievements: ["icebreaker"],
            themeId: "custom",
            customTheme: {
              bg: ["#000", "#111"],
              colors: ["#f00", "#0f0", "#00f", "#fff"],
              labels: "white",
              particles: { type: "spark", color: "#fff" },
              meterBg: "#222",
            },
          },
        },
        "players/player-1/customPrompts/p1": {
          data: { id: "p1", text: "Sing a song", category: "dare", intensity: "normal" },
        },
        "players/player-2": {
          data: {
            username: "Taylor",
            avatar: "🔥",
            streaks: { current: 1, best: 5 },
            refusals: { dare: 2 },
            triviaStats: { correct: 1, incorrect: 2, streak: 1 },
            badges: ["silver"],
            achievements: ["bold-step"],
            themeId: "romantic-glow",
          },
        },
        "players/player-2/customPrompts/p2": {
          data: { id: "p2", text: "Share your favorite memory", category: "truth", intensity: "normal" },
        },
      },
    });

    const { mergePlayerProfilesByUsername } = profileModule;
    const result = await mergePlayerProfilesByUsername("player-1");

    expect(result).toBeTruthy();
    expect(result.profile.username).toBe("Taylor");
    expect(result.profile.badges).toEqual(["bronze", "silver"]);
    expect(result.profile.achievements).toEqual(["bold-step", "icebreaker"]);
    expect(result.prompts).toHaveLength(2);
    expect(result.prompts.map((prompt) => prompt.id)).toEqual(["p1", "p2"]);

    const topLevelPaths = new Set(
      state.setDocCalls
        .filter((call) => call.ref.path.startsWith("players/player-") && call.ref.path.split("/").length === 2)
        .map((call) => call.ref.path)
    );
    expect(Array.from(topLevelPaths).sort()).toEqual(["players/player-1", "players/player-2"]);
  });
});

describe("achievement persistence", () => {
  it("applies arrayUnion semantics to player and game profile documents", async () => {
    const { profileModule, state } = await importProfileModule({
      initialDocs: {
        "players/player-1": { data: { achievements: ["existing"], username: "Sky" } },
        "games/game-42/players/player-1": { data: { achievements: ["existing"] } },
      },
    });

    const { addAchievementsToProfile } = profileModule;
    const result = await addAchievementsToProfile(
      { playerId: "player-1", gameId: "game-42" },
      ["legendary-run", "existing"]
    );

    expect(result.updated).toBe(true);
    const playerDoc = state.docs.get("players/player-1");
    const gameDoc = state.docs.get("games/game-42/players/player-1");
    expect(playerDoc.data.achievements).toEqual(["existing", "legendary-run"]);
    expect(gameDoc.data.achievements).toEqual(["existing", "legendary-run"]);
  });
});
