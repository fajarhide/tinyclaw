export type WebSearchSiteState = "pending" | "loading" | "done";

export interface WebSearchSource {
  title: string;
  url: string;
  href?: string;
}

export interface WebSearchToolState {
  query: string | null;
  sources: WebSearchSource[];
  status: "running" | "done";
}
