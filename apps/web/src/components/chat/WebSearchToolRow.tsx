import { useEffect, useRef, useState } from "react";
import type { ChatListItem } from "@/lib/chat-history";
import { WebSearch } from "@/components/chat/WebSearch";
import type { WebSearchSiteState } from "@/components/chat/web-search.shared";
import {
  buildWebSearchToolState,
  shouldRenderWebSearchToolRow,
} from "@/lib/chat-stream-web-search";

const STAGGER_LOADING_MS = 150;
const STAGGER_DONE_MS = 400;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function buildInitialSiteStates(
  count: number,
  status: "running" | "done",
  reducedMotion: boolean,
): WebSearchSiteState[] {
  if (count === 0) {
    return [];
  }

  if (status === "running" || reducedMotion) {
    return Array.from({ length: count }, () => (status === "done" ? "done" : "pending"));
  }

  return Array.from({ length: count }, () => "pending");
}

export function WebSearchToolRow({ message }: { message: ChatListItem }) {
  const state = buildWebSearchToolState(message);
  const reducedMotion = usePrefersReducedMotion();
  const isRunning = state.status === "running";
  const [open, setOpen] = useState(isRunning);
  const [siteStates, setSiteStates] = useState<WebSearchSiteState[]>(() =>
    buildInitialSiteStates(state.sources.length, state.status, reducedMotion),
  );
  const staggerRunRef = useRef(0);

  useEffect(() => {
    if (isRunning) {
      setOpen(true);
    }
  }, [isRunning]);

  useEffect(() => {
    const count = state.sources.length;

    if (state.status === "running") {
      setSiteStates(buildInitialSiteStates(count, "running", reducedMotion));
      return;
    }

    if (count === 0) {
      setSiteStates([]);
      return;
    }

    if (reducedMotion) {
      setSiteStates(Array.from({ length: count }, () => "done"));
      return;
    }

    const runId = staggerRunRef.current + 1;
    staggerRunRef.current = runId;
    const timers: ReturnType<typeof setTimeout>[] = [];

    setSiteStates(Array.from({ length: count }, () => "pending"));

    for (let index = 0; index < count; index += 1) {
      timers.push(
        setTimeout(() => {
          if (staggerRunRef.current !== runId) {
            return;
          }

          setSiteStates((current) =>
            current.map((value, currentIndex) =>
              currentIndex === index ? "loading" : value,
            ),
          );
        }, STAGGER_LOADING_MS * (index + 1)),
      );

      timers.push(
        setTimeout(() => {
          if (staggerRunRef.current !== runId) {
            return;
          }

          setSiteStates((current) =>
            current.map((value, currentIndex) =>
              currentIndex === index ? "done" : value,
            ),
          );
        }, STAGGER_LOADING_MS * (index + 1) + STAGGER_DONE_MS),
      );
    }

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [reducedMotion, state.sources.length, state.status]);

  if (!shouldRenderWebSearchToolRow(message)) {
    return null;
  }

  const query = state.query ?? "the web";

  return (
    <div className="w-full max-w-full">
      <WebSearch
        query={query}
        sources={state.sources}
        siteStates={siteStates}
        isComplete={!isRunning}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

export { shouldRenderWebSearchToolRow };
