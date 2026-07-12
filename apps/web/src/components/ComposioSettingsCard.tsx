import { ExternalLinkIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useComposioSettings, useSaveComposioSettings } from "@/hooks/use-composio";
import { formatError } from "@/lib/client";
import { cn } from "@/lib/utils";

function ComposioStatusBadge({ configured }: { configured: boolean }) {
  if (configured) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
        <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
        Configured
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      Not configured
    </span>
  );
}

export function ComposioSettingsCard() {
  const { data: settings, isLoading, error: loadError } = useComposioSettings();
  const saveMutation = useSaveComposioSettings();
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setApiKey("");
  }, [settings]);

  if (isLoading) {
    return (
      <Card className="w-full shadow-none">
        <CardContent className="py-12">
          <div className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
            <Spinner className="size-5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const configured = settings?.configured === true;
  const canSave = configured || apiKey.trim().length > 0;
  const errorMessage = formError ?? (loadError ? formatError(loadError) : null);

  async function handleSave() {
    setFormError(null);

    try {
      await saveMutation.mutateAsync({
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      });
      setApiKey("");
    } catch (error) {
      setFormError(formatError(error));
    }
  }

  return (
    <Card className="w-full overflow-hidden shadow-none">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 p-5 pb-4">
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold leading-tight text-foreground">Composio</h2>
            <p className="text-sm leading-snug text-muted-foreground">
              Enable toolkits, connect SaaS accounts with OAuth, and sync tools for profile
              assignment.
            </p>
          </div>
          <ComposioStatusBadge configured={configured} />
        </div>

        <div className="border-t border-border" />

        <div className="space-y-3 p-5">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Project API key</p>
            <p className="text-sm text-muted-foreground">
              Paste your Composio <span className="text-foreground">project API key</span> to enable
              SaaS integrations. This is not the MCP consumer key shown on the dashboard home page or
              under AI Clients.
            </p>
          </div>

          <InputGroup className="h-9">
            <InputGroupInput
              type={showApiKey ? "text" : "password"}
              autoComplete="off"
              placeholder={
                configured && settings?.apiKeyMasked
                  ? `Saved (${settings.apiKeyMasked})`
                  : "Paste API key"
              }
              value={apiKey}
              disabled={saveMutation.isPending}
              onChange={(event) => {
                setApiKey(event.target.value);
                if (formError) {
                  setFormError(null);
                }
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                size="icon-xs"
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
                onClick={() => setShowApiKey((current) => !current)}
              >
                {showApiKey ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>

          <p className="text-sm text-muted-foreground">
            Saved to{" "}
            <code className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-foreground">
              ~/.nakama/composio/config.ini
            </code>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 px-5 py-3">
          <a
            href="https://docs.composio.dev/reference/authentication"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden />
            <span>
              Get a project API key:{" "}
              <span className={cn("font-medium text-primary")}>
                Settings → Project Settings → API Keys
              </span>
            </span>
          </a>
          <Button
            type="button"
            size="sm"
            className="min-w-[4.5rem]"
            disabled={!canSave || saveMutation.isPending}
            onClick={() => void handleSave()}
          >
            {saveMutation.isPending ? <Spinner className="size-4" /> : "Save"}
          </Button>
        </div>

        {errorMessage ? (
          <p className="px-5 pb-4 text-sm text-destructive">{errorMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
