import type { ChatMessage } from "./contract";

export function extractThinkingFromAssistantMessage(
  message: Extract<ChatMessage, { role: "assistant" }>,
): string | undefined {
  const direct = message.thinking?.trim();

  if (direct) {
    return direct;
  }

  return extractThinkingFromProviderContent(message.providerContent);
}

export function extractThinkingFromProviderContent(
  content: unknown[] | undefined,
): string | undefined {
  if (!content?.length) {
    return undefined;
  }

  const parts: string[] = [];

  for (const item of content) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const block = item as Record<string, unknown>;

    if (block.type === "thinking" && typeof block.thinking === "string") {
      const text = block.thinking.trim();

      if (text) {
        parts.push(text);
      }

      continue;
    }

    if (block.type === "reasoning") {
      const summary = block.summary;

      if (Array.isArray(summary)) {
        for (const entry of summary) {
          if (
            typeof entry === "object" &&
            entry !== null &&
            "text" in entry &&
            typeof (entry as { text?: unknown }).text === "string"
          ) {
            const text = (entry as { text: string }).text.trim();

            if (text) {
              parts.push(text);
            }
          }
        }
      }
    }
  }

  const combined = parts.join("\n\n").trim();
  return combined || undefined;
}
