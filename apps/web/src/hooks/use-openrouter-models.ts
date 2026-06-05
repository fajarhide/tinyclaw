import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  normalizeOpenRouterModels,
  type OpenRouterModelRow,
  type OpenRouterModelsApiResponse,
} from "@/lib/openrouter-models";
import { queryKeys } from "@/lib/query-keys";

const OPENROUTER_MODELS_URL =
  "https://openrouter.ai/api/v1/models?output_modalities=text";

async function fetchOpenRouterModels(): Promise<OpenRouterModelRow[]> {
  const res = await fetch(OPENROUTER_MODELS_URL);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = (await res.json()) as OpenRouterModelsApiResponse;
  return normalizeOpenRouterModels(data);
}

export const openRouterModelsQueryOptions = queryOptions({
  queryKey: queryKeys.openRouterModels,
  queryFn: fetchOpenRouterModels,
  staleTime: 1000 * 60 * 30,
});

export function useOpenRouterModels() {
  return useQuery(openRouterModelsQueryOptions);
}
