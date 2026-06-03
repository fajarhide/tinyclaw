import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { SelectedProvider } from "@/lib/models";

export interface ModelsDevRow {
  providerId: string;
  providerName: string;
  apiUrl: string;
  modelId: string;
  modelName: string;
  isFree: boolean;
  deprecated: boolean;
  context: number;
  toolCall: boolean;
  reasoning: boolean;
  vision: boolean;
  isZen: boolean;
  tinyclawProvider: SelectedProvider;
}

// opencode (Zen) maps to openai_compatible — free models work without an API key.
const PROVIDER_MAP: Record<string, SelectedProvider> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "gemini",
  openrouter: "openrouter",
  opencode: "openai_compatible",
};

async function fetchModelsDev(): Promise<ModelsDevRow[]> {
  const res = await fetch("https://models.dev/api.json");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = (await res.json()) as Record<string, unknown>;
  const rows: ModelsDevRow[] = [];

  for (const [providerId, p] of Object.entries(data)) {
    const provider = p as Record<string, unknown>;
    const providerName = (provider.name as string | undefined) ?? providerId;
    const apiUrl = (provider.api as string | undefined) ?? "";
    const models = (provider.models as Record<string, unknown> | undefined) ?? {};

    for (const [modelId, m] of Object.entries(models)) {
      const model = m as Record<string, unknown>;
      const cost = model.cost as Record<string, number> | number | undefined;
      let inputCost: number | undefined;
      let outputCost: number | undefined;

      if (typeof cost === "object" && cost !== null) {
        inputCost = cost.input;
        outputCost = cost.output;
      } else if (typeof cost === "number") {
        inputCost = outputCost = cost;
      }

      const limit = (model.limit as Record<string, number> | undefined) ?? {};
      const modalities = (model.modalities as Record<string, string[]> | undefined) ?? {};

      rows.push({
        providerId,
        providerName,
        apiUrl,
        modelId,
        modelName: (model.name as string | undefined) ?? modelId,
        isFree: inputCost === 0 && outputCost === 0,
        deprecated: (model.status as string | undefined) === "deprecated",
        context: (limit.context as number | undefined) ?? 0,
        toolCall: !!(model.tool_call as boolean | undefined),
        reasoning: !!(model.reasoning as boolean | undefined),
        vision: (modalities.input ?? []).includes("image"),
        isZen: providerId === "opencode",
        tinyclawProvider: PROVIDER_MAP[providerId] ?? "openai_compatible",
      });
    }
  }

  return rows;
}

export const modelsDevQueryOptions = queryOptions({
  queryKey: queryKeys.modelsDev,
  queryFn: fetchModelsDev,
  staleTime: 1000 * 60 * 30,
});

export function useModelsDev() {
  return useQuery(modelsDevQueryOptions);
}
