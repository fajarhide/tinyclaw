import { describe, expect, test } from "bun:test";
import { formatThinkingIndicator } from "./thinking-indicator";

describe("formatThinkingIndicator", () => {
  test("cycles through spinner frames", () => {
    expect(formatThinkingIndicator(0)).toBe("\x1b[2m⠋ Thinking\x1b[0m");
    expect(formatThinkingIndicator(1)).toBe("\x1b[2m⠙ Thinking\x1b[0m");
    expect(formatThinkingIndicator(10)).toBe("\x1b[2m⠋ Thinking\x1b[0m");
  });
});
