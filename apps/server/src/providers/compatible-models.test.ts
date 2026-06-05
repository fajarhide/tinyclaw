import { describe, expect, test } from "bun:test";
import { getModelsForConfiguredProvider, mergeOpenRouterCatalog } from "./compatible-models";
import { AVAILABLE_MODELS } from "./models";

describe("mergeOpenRouterCatalog", () => {
  test("merges custom display names over static entries", () => {
    const staticModels = AVAILABLE_MODELS.filter((model) => model.provider === "openrouter");
    const merged = mergeOpenRouterCatalog(staticModels, [
      { id: "anthropic/claude-sonnet-4-6", name: "My Sonnet" },
      { id: "google/gemini-2.5-pro-preview", name: "Gemini Pro" },
    ]);

    expect(merged.find((model) => model.id === "anthropic/claude-sonnet-4-6")?.name).toBe(
      "My Sonnet",
    );
    expect(merged.some((model) => model.id === "openai/gpt-5.4")).toBe(true);
  });
});

describe("getModelsForConfiguredProvider openrouter", () => {
  test("uses shortlist only when custom models are saved", () => {
    const models = getModelsForConfiguredProvider("openrouter", {
      provider: "openrouter",
      apiKey: "sk-test",
      customModels: [{ id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama Free" }],
    });

    expect(
      models.some((model) => model.id === "meta-llama/llama-3.3-70b-instruct:free"),
    ).toBe(true);
    expect(models.some((model) => model.id === "openai/gpt-5.4")).toBe(false);
  });

  test("falls back to built-in catalog when no shortlist", () => {
    const models = getModelsForConfiguredProvider("openrouter", {
      provider: "openrouter",
      apiKey: "sk-test",
    });

    expect(models.some((model) => model.id === "openai/gpt-5.4")).toBe(true);
  });
});
