import type { LucideIcon } from "lucide-react";
import { BlocksIcon, BookOpenIcon, BrainIcon, PlugIcon } from "lucide-react";
import { useCallback } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { KnowledgeTab } from "@/components/soul-tools/KnowledgeTab";
import { SoulTab } from "@/components/soul-tools/SoulTab";
import { McpTab } from "@/components/soul-tools/McpTab";
import { ToolsTab } from "@/components/soul-tools/ToolsTab";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { canAccessSystemPage } from "@/lib/navigation";

const TABS = [
  { id: "soul" as const, label: "Soul", icon: BrainIcon },
  { id: "knowledge" as const, label: "Knowledge", icon: BookOpenIcon },
  { id: "tools" as const, label: "Tools", icon: BlocksIcon },
  { id: "mcp" as const, label: "MCP", icon: PlugIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

function resolveTab(value: string | null, isPlatformAdmin: boolean): TabId {
  if (!isPlatformAdmin) {
    return "tools";
  }

  if (value === "knowledge" || value === "tools" || value === "mcp") {
    return value;
  }

  return "soul";
}

export function SoulPage() {
  const { user, activeOrg, isLoading } = useAuth();
  const isPlatformAdmin = user?.isPlatformAdmin === true;
  const canAccess = canAccessSystemPage(isPlatformAdmin, activeOrg?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = resolveTab(searchParams.get("tab"), isPlatformAdmin);
  const visibleTabs = isPlatformAdmin ? TABS : TABS.filter((item) => item.id === "tools");

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to="/chat" replace />;
  }

  const setTab = useCallback(
    (nextTab: TabId) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (nextTab === "soul") {
            next.delete("tab");
          } else {
            next.set("tab", nextTab);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Soul and tools"
        className="segmented-control"
      >
        {visibleTabs.map((item) => (
          <SegmentedTab
            key={item.id}
            id={`soul-tools-tab-${item.id}`}
            label={item.label}
            icon={item.icon}
            active={tab === item.id}
            controls={`soul-tools-panel-${item.id}`}
            onSelect={() => setTab(item.id)}
          />
        ))}
      </div>

      <div
        id={`soul-tools-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`soul-tools-tab-${tab}`}
      >
        {tab === "soul" ? (
          <SoulTab />
        ) : tab === "knowledge" ? (
          <KnowledgeTab />
        ) : tab === "tools" ? (
          <ToolsTab />
        ) : (
          <McpTab />
        )}
      </div>
    </div>
  );
}

function SegmentedTab({
  id,
  label,
  icon: Icon,
  active,
  controls,
  onSelect,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  controls: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      data-active={active || undefined}
      className="segmented-control-item"
      onClick={onSelect}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      {label}
    </button>
  );
}
