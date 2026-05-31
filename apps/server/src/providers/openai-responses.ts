import type {
  ChatCompletionResult,
  ChatMessage,
  GenerateChatInput,
  LlmToolDefinition,
  StreamChatHandlers,
  ThinkingEffort,
  ToolCall,
} from "@tinyclaw/core";
import {
  isMessageContentPartArray,
  toOpenAIResponsesUserContent,
  WEB_SEARCH_TOOL_NAME,
} from "@tinyclaw/core";

type ResponseItem = Record<string, unknown>;

export async function generateOpenAIResponsesChat(options: {
  apiKey: string;
  model: string;
  input: GenerateChatInput;
  stream: boolean;
  handlers?: StreamChatHandlers;
}): Promise<ChatCompletionResult> {
  const body = await buildResponsesRequestBody(options.model, options.input, options.stream);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI request failed (${response.status}): ${await response.text()}`,
    );
  }

  if (options.stream) {
    if (!response.body) {
      throw new Error("OpenAI returned an empty stream.");
    }

    return readOpenAIResponsesStream(response.body, options.handlers);
  }

  const payload = (await response.json()) as { output?: ResponseItem[] };
  return parseResponsesOutput(payload.output ?? [], options.handlers);
}

async function buildResponsesRequestBody(
  model: string,
  input: GenerateChatInput,
  stream: boolean,
) {
  const tools = buildResponsesTools(input.tools, input.providerOptions?.webSearch ?? false);

  return {
    model,
    instructions: input.system,
    input: await toResponsesInput(input.messages),
    ...(tools.length > 0 ? { tools } : {}),
    ...buildOpenAIReasoningRequest(input),
    ...(stream ? { stream: true } : {}),
  };
}

function buildOpenAIReasoningRequest(
  input: GenerateChatInput,
): Record<string, unknown> {
  if (!input.providerOptions?.thinking?.enabled) {
    return {};
  }

  return {
    reasoning: {
      effort: mapOpenAIReasoningEffort(input.providerOptions.thinking.effort),
      summary: "auto",
    },
  };
}

function mapOpenAIReasoningEffort(effort: ThinkingEffort | undefined): ThinkingEffort {
  if (effort === "low" || effort === "medium" || effort === "high") {
    return effort;
  }

  return "medium";
}

function buildResponsesTools(tools: LlmToolDefinition[] | undefined, webSearch: boolean) {
  const hostedTools = webSearch ? [{ type: "web_search" }] : [];
  const functionTools = (tools ?? []).map((tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));

  return [...hostedTools, ...functionTools];
}

export async function toResponsesInput(messages: ChatMessage[]): Promise<unknown[]> {
  const input: unknown[] = [];

  for (const message of messages) {
    if (message.role === "user") {
      const content = await toOpenAIResponsesUserContent(message.content);

      if (isMessageContentPartArray(message.content)) {
        input.push({
          type: "message",
          role: "user",
          content,
        });
      } else {
        input.push({
          role: "user",
          content,
        });
      }

      continue;
    }

    if (message.role === "assistant") {
      if (message.toolCalls?.length) {
        if (message.content.trim()) {
          input.push({
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: message.content }],
          });
        }

        if (message.providerContent?.length) {
          for (const item of message.providerContent) {
            if (
              typeof item === "object" &&
              item !== null &&
              "type" in item &&
              item.type !== "function_call"
            ) {
              input.push(item);
            }
          }
        }

        for (const call of message.toolCalls) {
          input.push({
            type: "function_call",
            call_id: call.id,
            name: call.name,
            arguments: JSON.stringify(call.arguments),
          });
        }

        continue;
      }

      if (message.providerContent?.length) {
        input.push(...message.providerContent);
        continue;
      }

      if (message.content.trim()) {
        input.push({
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: message.content }],
        });
      }

      continue;
    }

    input.push({
      type: "function_call_output",
      call_id: message.toolCallId,
      output: message.content,
    });
  }

  return input;
}

function parseResponsesOutput(
  output: ResponseItem[],
  handlers?: StreamChatHandlers,
): ChatCompletionResult {
  const textParts: string[] = [];
  const thinkingParts: string[] = [];
  const toolCalls: ToolCall[] = [];

  for (const item of output) {
    if (item.type === "reasoning") {
      const summaryText = extractReasoningSummaryText(item);

      if (summaryText) {
        thinkingParts.push(summaryText);
      }

      continue;
    }

    if (item.type === "message") {
      const content = item.content;

      if (Array.isArray(content)) {
        for (const block of content) {
          if (
            typeof block === "object" &&
            block !== null &&
            "type" in block &&
            block.type === "output_text" &&
            typeof block.text === "string"
          ) {
            textParts.push(block.text);
          }
        }
      }
    }

    if (item.type === "web_search_call") {
      const action = readRecord(item.action);
      handlers?.onToolStart?.({
        toolCallId: String(item.id ?? ""),
        tool: WEB_SEARCH_TOOL_NAME,
        input: action,
      });
      handlers?.onToolEnd?.({
        toolCallId: String(item.id ?? ""),
        tool: WEB_SEARCH_TOOL_NAME,
        result: action,
      });
    }

    if (item.type === "function_call") {
      toolCalls.push({
        id: String(item.call_id ?? item.id ?? ""),
        name: String(item.name ?? ""),
        arguments: parseToolArguments(String(item.arguments ?? "{}")),
      });
    }
  }

  const content = textParts.join("").trim();
  const thinking = thinkingParts.join("\n\n").trim();
  const providerContent = output.length > 0 ? output : undefined;

  if (!content && toolCalls.length === 0 && !providerContent?.length) {
    throw new Error("OpenAI returned an empty response.");
  }

  return {
    content,
    toolCalls,
    assistantMessage: {
      role: "assistant",
      content,
      ...(thinking ? { thinking } : {}),
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
      ...(providerContent ? { providerContent } : {}),
    },
  };
}

function extractReasoningSummaryText(item: ResponseItem): string | undefined {
  const summary = item.summary;

  if (!Array.isArray(summary)) {
    return undefined;
  }

  const parts: string[] = [];

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

  const combined = parts.join("\n\n").trim();
  return combined || undefined;
}

async function readOpenAIResponsesStream(
  body: ReadableStream<Uint8Array>,
  handlers?: StreamChatHandlers,
): Promise<ChatCompletionResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let thinking = "";
  const output: ResponseItem[] = [];
  const outputIndex = new Map<string, ResponseItem>();

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const boundary = buffer.indexOf("\n\n");

      if (boundary < 0) {
        break;
      }

      const eventBlock = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      for (const line of eventBlock.split("\n")) {
        if (!line.startsWith("data: ")) {
          continue;
        }

        const data = line.slice(6).trim();

        if (!data || data === "[DONE]") {
          continue;
        }

        const payload = JSON.parse(data) as Record<string, unknown>;
        const type = String(payload.type ?? "");

        if (type === "response.output_text.delta") {
          const delta = String(payload.delta ?? "");
          content += delta;
          handlers?.onChunk(delta);
        }

        if (type === "response.reasoning_summary_text.delta") {
          const delta = String(payload.delta ?? "");
          thinking += delta;
          handlers?.onThinking?.(delta);
        }

        if (type === "response.output_item.added") {
          const item = readRecord(payload.item);
          const itemId = String(item.id ?? "");

          if (itemId) {
            outputIndex.set(itemId, item);
          }
        }

        if (type === "response.output_item.done") {
          const item = readRecord(payload.item);
          const itemId = String(item.id ?? "");
          output.push(item);

          if (itemId) {
            outputIndex.set(itemId, item);
          }

          if (item.type === "web_search_call") {
            const action = readRecord(item.action);
            handlers?.onToolStart?.({
              toolCallId: itemId,
              tool: WEB_SEARCH_TOOL_NAME,
              input: action,
            });
            handlers?.onToolEnd?.({
              toolCallId: itemId,
              tool: WEB_SEARCH_TOOL_NAME,
              result: action,
            });
          }
        }
      }
    }
  }

  if (output.length === 0 && outputIndex.size > 0) {
    output.push(...outputIndex.values());
  }

  const parsed = parseResponsesOutput(output, handlers);

  const thinkingText = thinking.trim() || parsed.assistantMessage.thinking;

  return {
    ...parsed,
    content: content.trim() || parsed.content,
    assistantMessage: {
      ...parsed.assistantMessage,
      content: content.trim() || parsed.content,
      ...(thinkingText ? { thinking: thinkingText } : {}),
    },
  };
}

function parseToolArguments(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();

  if (!trimmed) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
