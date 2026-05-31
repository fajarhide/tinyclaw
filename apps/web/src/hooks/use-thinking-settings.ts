import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ThinkingEffort, ThinkingSettings, UpdateThinkingRequest } from "@tinyclaw/core/contract";
import { useAppContext } from "@/context/app-context";
import { queryKeys } from "@/lib/query-keys";

export function useThinkingSettings() {
  const { client } = useAppContext();

  return useQuery({
    queryKey: queryKeys.thinkingSettings,
    queryFn: () => client.getThinkingSettings(),
  });
}

export function useSaveThinkingSettings() {
  const { client } = useAppContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: UpdateThinkingRequest) => client.setThinkingSettings(settings),
    onSuccess: (thinking) => {
      queryClient.setQueryData<ThinkingSettings>(queryKeys.thinkingSettings, thinking);
    },
  });
}

export function isThinkingEffort(value: string): value is ThinkingEffort {
  return value === "low" || value === "medium" || value === "high";
}
