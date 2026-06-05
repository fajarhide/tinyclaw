import { describe, expect, test } from "bun:test";
import { createInMemoryDatabaseAdapter } from "./adapters/in-memory";
import { createSqliteDatabase } from "./adapters/sqlite";
import { LLM_USAGE_STATS_ID } from "./constants";

describe("llm usage stats persistence", () => {
  test("in-memory adapter accumulates usage deltas", async () => {
    const db = createInMemoryDatabaseAdapter();
    const trackedSince = "2026-06-05T00:00:00.000Z";

    await db.incrementLlmUsageStats(
      {
        requestCount: 1,
        inputTokens: 100,
        outputTokens: 50,
        estimatedCostUsd: 0.01,
      },
      trackedSince,
    );
    await db.incrementLlmUsageStats(
      {
        requestCount: 1,
        inputTokens: 200,
        outputTokens: 75,
        estimatedCostUsd: 0.02,
      },
      trackedSince,
    );

    const stats = await db.getLlmUsageStats();
    expect(stats).toEqual({
      id: LLM_USAGE_STATS_ID,
      requestCount: 2,
      inputTokens: 300,
      outputTokens: 125,
      estimatedCostUsd: 0.03,
      trackedSince,
      updatedAt: expect.any(String),
    });
  });

  test("sqlite adapter accumulates usage deltas", async () => {
    const database = await createSqliteDatabase(":memory:");
    const db = database.adapter;
    const trackedSince = "2026-06-05T00:00:00.000Z";

    try {
      await db.incrementLlmUsageStats(
        {
          requestCount: 2,
          inputTokens: 400,
          outputTokens: 100,
          estimatedCostUsd: 0.05,
        },
        trackedSince,
      );

      const stats = await db.getLlmUsageStats();
      expect(stats).toEqual({
        id: LLM_USAGE_STATS_ID,
        requestCount: 2,
        inputTokens: 400,
        outputTokens: 100,
        estimatedCostUsd: 0.05,
        trackedSince,
        updatedAt: expect.any(String),
      });
    } finally {
      database.close();
    }
  });
});
