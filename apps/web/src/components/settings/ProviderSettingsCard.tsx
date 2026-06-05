import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";
import { ProviderSetupForm } from "@/components/ProviderSetupForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppContext } from "@/context/app-context";
import { useModelsQuery } from "@/hooks/use-app-queries";
import { useOpenRouterModels } from "@/hooks/use-openrouter-models";
import { formatError } from "@/lib/client";
import {
  buildConfigureProviderRequest,
  filterModelsByProvider,
  formatProviderLabel,
  getModelDisplayName,
  type SelectedProvider,
  validateApiKeyForProvider,
} from "@/lib/models";
import {
  mergeOpenRouterModelOptions,
  openRouterModelDisplayName,
} from "@/lib/openrouter-models";
import { ConnectedProviderSection } from "./connected-provider-section";
import { SwitchProviderSection } from "./switch-provider-section";

interface ProviderSettingsCardProps {
  formError: string | null;
  onFormError: (error: string | null) => void;
}

export function ProviderSettingsCard({ formError, onFormError }: ProviderSettingsCardProps) {
  const { health, models, configureProvider, setModel } = useAppContext();
  const { data: catalogResponse, isLoading: catalogLoading, error: catalogQueryError } =
    useModelsQuery();
  const { data: openRouterRows = [] } = useOpenRouterModels();
  const catalog = catalogResponse?.models ?? [];

  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyTouched, setApiKeyTouched] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modelBusy, setModelBusy] = useState(false);
  const [replaceKeyOpen, setReplaceKeyOpen] = useState(false);
  const [modelDraft, setModelDraft] = useState("");
  const [modelSaveHint, setModelSaveHint] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isConfigured = health?.providerConfigured === true && models != null;

  useEffect(() => {
    if (catalogQueryError) {
      onFormError(formatError(catalogQueryError));
    }
  }, [catalogQueryError, onFormError]);

  useEffect(() => {
    if (models?.provider) {
      setModelDraft(models.currentModel ?? "");
    }
  }, [models?.provider, models?.currentModel]);

  useEffect(() => {
    if (isConfigured) {
      setReplaceKeyOpen(false);
    }
  }, [isConfigured]);

  const configuredModels = useMemo(() => {
    const filtered = filterModelsByProvider(catalog, models?.provider);
    if (models?.provider === "openrouter" && models.currentModel) {
      return mergeOpenRouterModelOptions(
        filtered,
        models.currentModel,
        openRouterModelDisplayName(openRouterRows, models.currentModel),
      );
    }
    return filtered;
  }, [catalog, models?.provider, models?.currentModel, openRouterRows]);

  const clearFieldErrors = useCallback(() => {
    setApiKeyError(null);
    onFormError(null);
  }, [onFormError]);

  const handleApiKeyBlur = useCallback(() => {
    setApiKeyTouched(true);

    if (!apiKey.trim()) {
      setApiKeyError(null);
      return;
    }

    setApiKeyError(
      validateApiKeyForProvider(apiKey, models?.provider as SelectedProvider),
    );
  }, [apiKey, models?.provider]);

  const handleApiKeyChange = useCallback(
    (value: string) => {
      setApiKey(value);
      setSuccessMessage(null);

      if (formError) {
        onFormError(null);
      }

      if (apiKeyTouched && value.trim()) {
        setApiKeyError(
          validateApiKeyForProvider(value, models?.provider as SelectedProvider),
        );
      } else if (apiKeyError) {
        setApiKeyError(null);
      }
    },
    [apiKeyTouched, apiKeyError, formError, models?.provider, onFormError],
  );

  const handleSubmitReplaceKey = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const trimmedKey = apiKey.trim();
      const nextApiKeyError = validateApiKeyForProvider(
        trimmedKey,
        models!.provider as SelectedProvider,
      );

      setApiKeyTouched(true);
      setApiKeyError(nextApiKeyError);

      if (nextApiKeyError) {
        document.getElementById("replace-api-key")?.focus();
        return;
      }

      const modelToSave = models?.currentModel ?? "";

      setBusy(true);
      onFormError(null);
      setSuccessMessage(null);
      setModelSaveHint(null);

      try {
        await configureProvider(
          buildConfigureProviderRequest({
            apiKey: trimmedKey,
            provider: models!.provider as SelectedProvider,
            model: modelToSave || undefined,
            displayName: models?.displayName ?? undefined,
            baseUrl: models?.baseUrl ?? undefined,
            customModels: models?.customModels,
          }),
        );
        setApiKey("");
        setApiKeyTouched(false);
        setShowApiKey(false);
        setReplaceKeyOpen(false);
        setSuccessMessage("API key updated.");
      } catch (err) {
        onFormError(formatError(err));
        document.getElementById("replace-api-key")?.focus();
      } finally {
        setBusy(false);
      }
    },
    [apiKey, configureProvider, models, onFormError],
  );

  const closeReplaceKeyForm = useCallback(() => {
    setReplaceKeyOpen(false);
    setApiKey("");
    setApiKeyTouched(false);
    setApiKeyError(null);
    clearFieldErrors();
  }, [clearFieldErrors]);

  const handleSaveModel = useCallback(async () => {
    if (!modelDraft || modelDraft === models?.currentModel) {
      return;
    }

    setModelBusy(true);
    onFormError(null);
    setModelSaveHint(null);

    try {
      await setModel(modelDraft);
      setModelSaveHint(`Saved · ${getModelDisplayName(catalog, modelDraft)}`);
    } catch (err) {
      onFormError(formatError(err));
    } finally {
      setModelBusy(false);
    }
  }, [modelDraft, models?.currentModel, setModel, catalog, onFormError]);

  if (catalogLoading) {
    return <ProviderSettingsSkeleton />;
  }

  return (
    <>
      <Card className="w-full">
        <CardContent className="p-0">
          {!isConfigured ? (
            <>
              <div className="flex items-start gap-3 border-b border-border px-4 py-3">
                <AlertTriangleIcon
                  className="mt-0.5 size-5 shrink-0 text-amber-200"
                  aria-hidden="true"
                />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-amber-100">No provider connected</p>
                  <p className="text-xs text-amber-200/90">
                    Chat is offline until you add an API key below.
                  </p>
                </div>
              </div>
              <div className="px-4 py-4">
                <ProviderSetupForm
                  onSuccess={() => {
                    setSuccessMessage("Provider connected.");
                  }}
                />
              </div>
            </>
          ) : (
            <ConnectedProviderSection
              models={models}
              configureProvider={configureProvider}
              configuredModels={configuredModels}
              modelDraft={modelDraft}
              modelBusy={modelBusy}
              modelDirty={modelDraft !== models.currentModel}
              modelSaveHint={modelSaveHint}
              formError={formError}
              replaceKeyOpen={replaceKeyOpen}
              apiKey={apiKey}
              showApiKey={showApiKey}
              apiKeyError={apiKeyError}
              replaceKeyBusy={busy}
              onModelDraftChange={(value) => {
                setModelDraft(value);
                setModelSaveHint(null);
                if (formError) {
                  onFormError(null);
                }
              }}
              onSaveModel={() => void handleSaveModel()}
              onOpenReplaceKey={() => {
                setReplaceKeyOpen(true);
                setSuccessMessage(null);
                clearFieldErrors();
              }}
              onCancelReplaceKey={closeReplaceKeyForm}
              onApiKeyChange={handleApiKeyChange}
              onApiKeyBlur={handleApiKeyBlur}
              onToggleShowApiKey={() => setShowApiKey((current) => !current)}
              onSubmitReplaceKey={(event) => void handleSubmitReplaceKey(event)}
            />
          )}
        </CardContent>
      </Card>

      {successMessage ? (
        <div className="flex items-start gap-3" role="status" aria-live="polite">
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-300" />
          <p className="text-sm text-emerald-100">{successMessage}</p>
        </div>
      ) : null}

      {isConfigured && models?.provider ? (
        <Card className="w-full">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle>Switch provider</CardTitle>
            <CardDescription>
              Currently on {formatProviderLabel(models.provider, models.displayName)}. Chat
              history resets when you change providers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <SwitchProviderSection
              currentProvider={models.provider as SelectedProvider}
              catalog={catalog}
              configureProvider={configureProvider}
              onSuccess={(message) => {
                setSuccessMessage(message);
                onFormError(null);
              }}
            />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function ProviderSettingsSkeleton() {
  return (
    <Card className="w-full animate-pulse" aria-hidden="true">
      <CardContent className="space-y-5 p-4">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
        </div>
        <div className="h-10 max-w-sm rounded-lg bg-muted" />
        <div className="border-t border-border pt-4">
          <div className="h-10 rounded-lg bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
