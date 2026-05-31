import { describe, expect, test } from "bun:test";
import {
  extractThinkingFromAssistantMessage,
  extractThinkingFromProviderContent,
} from "./thinking-content";

describe("extractThinkingFromProviderContent", () => {
  test("joins Anthropic thinking blocks", () => {
    const text = extractThinkingFromProviderContent([
      { type: "thinking", thinking: "Step one." },
      { type: "text", text: "Answer." },
    ]);

    expect(text).toBe("Step one.");
  });

  test("joins OpenAI reasoning summaries", () => {
    const text = extractThinkingFromProviderContent([
      {
        type: "reasoning",
        summary: [{ type: "summary_text", text: "Reasoning trace." }],
      },
    ]);

    expect(text).toBe("Reasoning trace.");
  });
});

describe("extractThinkingFromAssistantMessage", () => {
  test("prefers direct thinking field", () => {
    const text = extractThinkingFromAssistantMessage({
      role: "assistant",
      content: "Hi",
      thinking: "Direct trace",
      providerContent: [{ type: "thinking", thinking: "Ignored" }],
    });

    expect(text).toBe("Direct trace");
  });
});
