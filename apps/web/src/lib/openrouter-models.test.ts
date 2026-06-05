import { describe, expect, test } from "bun:test";
import {
  isOpenRouterModelFree,
  mergeOpenRouterModelOptions,
  normalizeOpenRouterModels,
} from "./openrouter-models";

const fixture = {
  data: [
    {
      id: "nvidia/nemotron-3-ultra-550b-a55b:free",
      name: "NVIDIA: Nemotron 3 Ultra (free)",
      description: "Free variant",
      context_length: 1000000,
      architecture: { input_modalities: ["text"] },
      supported_parameters: ["tools", "reasoning"],
      pricing: { prompt: "0", completion: "0" },
      expiration_date: null,
    },
    {
      id: "nvidia/nemotron-3-ultra-550b-a55b",
      name: "NVIDIA: Nemotron 3 Ultra",
      description: "Paid variant",
      context_length: 1000000,
      architecture: { input_modalities: ["text", "image"] },
      supported_parameters: ["tools"],
      pricing: { prompt: "0.0000005", completion: "0.0000025" },
      expiration_date: null,
    },
    {
      id: "openrouter/owl-alpha",
      name: "Owl Alpha",
      description: "Free without :free suffix",
      context_length: 128000,
      architecture: { input_modalities: ["text"] },
      supported_parameters: [],
      pricing: { prompt: "0", completion: "0" },
      expiration_date: "2027-01-01",
    },
  ],
};

describe("isOpenRouterModelFree", () => {
  test("returns true when prompt and completion are zero", () => {
    expect(isOpenRouterModelFree({ prompt: "0", completion: "0" })).toBe(true);
  });

  test("returns false when completion is non-zero", () => {
    expect(isOpenRouterModelFree({ prompt: "0", completion: "0.0000025" })).toBe(false);
  });
});

describe("normalizeOpenRouterModels", () => {
  test("marks free models and sorts free first", () => {
    const rows = normalizeOpenRouterModels(fixture);

    expect(rows).toHaveLength(3);
    expect(rows[0]?.isFree).toBe(true);
    expect(rows[1]?.isFree).toBe(true);
    expect(rows[2]?.isFree).toBe(false);
    expect(rows.find((row) => row.id.endsWith(":free"))?.isFree).toBe(true);
  });

  test("detects vision and capability chips", () => {
    const rows = normalizeOpenRouterModels(fixture);
    const paid = rows.find((row) => row.id === "nvidia/nemotron-3-ultra-550b-a55b");

    expect(paid?.vision).toBe(true);
    expect(paid?.tools).toBe(true);
    expect(paid?.reasoning).toBe(false);
  });

  test("marks deprecated when expiration_date is set", () => {
    const rows = normalizeOpenRouterModels(fixture);
    const owl = rows.find((row) => row.id === "openrouter/owl-alpha");

    expect(owl?.deprecated).toBe(true);
  });
});

describe("mergeOpenRouterModelOptions", () => {
  test("injects current model when missing from catalog", () => {
    const catalog = [
      { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet", provider: "openrouter" as const },
    ];
    const merged = mergeOpenRouterModelOptions(
      catalog,
      "google/gemini-2.5-pro-preview",
      "Gemini 2.5 Pro",
    );

    expect(merged).toHaveLength(2);
    expect(merged[0]?.id).toBe("google/gemini-2.5-pro-preview");
    expect(merged[0]?.name).toBe("Gemini 2.5 Pro");
  });

  test("does not duplicate when model already in catalog", () => {
    const catalog = [
      { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet", provider: "openrouter" as const },
    ];
    const merged = mergeOpenRouterModelOptions(catalog, "anthropic/claude-sonnet-4-6");

    expect(merged).toHaveLength(1);
  });
});
