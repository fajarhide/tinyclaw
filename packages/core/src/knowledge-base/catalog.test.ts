import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { composeKnowledgeBaseCatalog } from "./catalog";

describe("knowledge base catalog", () => {
  let tempConfigDir = "";
  const previousConfigDir = process.env.TINYCLAW_CONFIG_DIR;

  afterEach(async () => {
    process.env.TINYCLAW_CONFIG_DIR = previousConfigDir;

    if (tempConfigDir) {
      await rm(tempConfigDir, { recursive: true, force: true });
      tempConfigDir = "";
    }
  });

  test("includes inherited TinyClaw documentation source", async () => {
    tempConfigDir = await mkdtemp(path.join(os.tmpdir(), "tinyclaw-kb-catalog-"));
    process.env.TINYCLAW_CONFIG_DIR = tempConfigDir;

    const catalog = await composeKnowledgeBaseCatalog("org_test", "profile_test");

    expect(catalog).toContain("# Knowledge Base");
    expect(catalog).toContain("TinyClaw Documentation");
    expect(catalog).toContain("https://ahmadrosid.github.io/tinyclaw/");
    expect(catalog).toContain("Use web_fetch");
  });
});
