import { describe, expect, test } from "bun:test";
import { createInMemoryDatabaseAdapter } from "./adapters/in-memory";
import { USER_CONTEXT_TEMPLATE } from "@tinyclaw/core";

describe("user context storage", () => {
  test("init creates context and second init is a no-op", async () => {
    const db = createInMemoryDatabaseAdapter();
    const now = "2026-06-21T10:00:00.000Z";

    await db.createUser({
      id: "user_1",
      email: "alice@example.com",
      passwordHash: "hash",
      isPlatformAdmin: false,
      createdAt: now,
      updatedAt: now,
    });

    expect(await db.getUserContext("user_1")).toBeNull();

    await db.setUserContext("user_1", USER_CONTEXT_TEMPLATE, now);
    expect(await db.getUserContext("user_1")).toBe(USER_CONTEXT_TEMPLATE);

    await db.setUserContext("user_1", "# Updated", now);
    expect(await db.getUserContext("user_1")).toBe("# Updated");
  });
});
