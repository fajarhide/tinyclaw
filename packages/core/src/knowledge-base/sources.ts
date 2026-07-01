import type { KnowledgeBaseSource } from "../contract";

export const DEFAULT_KNOWLEDGE_SOURCES: KnowledgeBaseSource[] = [
  {
    id: "tinyclaw-docs",
    title: "TinyClaw Documentation",
    url: "https://ahmadrosid.github.io/tinyclaw/",
    description:
      "Official TinyClaw docs for setup, profiles, tools, orgs, integrations, API, and troubleshooting.",
    kind: "url",
    inherited: true,
    enabled: true,
  },
];

export async function listKnowledgeBaseSources(): Promise<KnowledgeBaseSource[]> {
  return DEFAULT_KNOWLEDGE_SOURCES.filter((source) => source.enabled).map((source) => ({
    ...source,
  }));
}
