import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const analyticsModulePath = path.resolve(__dirname, "../src/hooks/useAnalytics.js");
const firebaseConfigPath = path.resolve(__dirname, "../src/config/firebase.js");

const importAnalyticsModule = async () => {
  vi.resetModules();
  vi.doMock(firebaseConfigPath, () => ({ db: null }));
  vi.doMock("firebase/firestore", () => ({
    addDoc: vi.fn(),
    collection: vi.fn(),
    serverTimestamp: vi.fn(() => ({ __op: "serverTimestamp" })),
  }));
  return import(analyticsModulePath);
};

describe("analytics summarization", () => {
  it("builds comprehensive summaries from event streams", async () => {
    const { summarizeAnalyticsEvents } = await importAnalyticsModule();

    const summary = summarizeAnalyticsEvents([
      {
        type: "round",
        outcome: "completed",
        slice: "truth",
        playerId: "p1",
        username: "Avery",
        streak: 3,
        createdAt: 1000,
      },
      {
        type: "round",
        outcome: "completed",
        slice: "dare",
        playerId: "p2",
        username: "Blair",
        streak: 1,
        createdAt: 2000,
      },
      {
        type: "refusal",
        reason: "timeout",
        slice: "dare",
        playerId: "p2",
        username: "Blair",
        createdAt: 3000,
      },
      {
        type: "triviaAccuracy",
        correct: true,
        responseTimeMs: 1800,
        streak: 4,
        playerId: "p1",
        username: "Avery",
        createdAt: 4000,
      },
      {
        type: "triviaAccuracy",
        correct: false,
        responseTimeMs: 2600,
        streak: 0,
        playerId: "p1",
        username: "Avery",
        createdAt: 5000,
      },
      {
        type: "badge",
        badgeId: "legendary-streak",
        playerId: "p1",
        username: "Avery",
        createdAt: 6000,
      },
      {
        type: "timeout",
        autoRefusal: true,
        slice: "truth",
        playerId: "p3",
        username: "Casey",
        createdAt: 7000,
      },
    ]);

    expect(summary.rounds.total).toBe(2);
    expect(summary.rounds.completed).toBe(2);
    expect(summary.rounds.bySlice.truth).toBe(1);
    expect(summary.refusals.total).toBe(2);
    expect(summary.refusals.byReason.timeout).toBe(2);
    expect(summary.trivia.attempts).toBe(2);
    expect(summary.trivia.correct).toBe(1);
    expect(summary.trivia.incorrect).toBe(1);
    expect(summary.trivia.accuracyPercent).toBeCloseTo(50, 5);
    expect(summary.trivia.averageResponseMs).toBe(2200);
    expect(summary.badges.earned).toContain("legendary-streak");
    expect(summary.streaks.longestOverall).toBe(4);
    expect(summary.players).toHaveLength(3);
    expect(summary.window.startedAt).toBe(1000);
    expect(summary.window.endedAt).toBe(7000);
  });
});
