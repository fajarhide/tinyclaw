import type { ProviderModelOption } from "@tinyclaw/core/contract";
import { useEffect, useMemo, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { ModelsBrowseList } from "@/components/ModelsBrowseList";
import { OpenRouterModelPicker } from "@/components/OpenRouterModelPicker";
import {
  CustomCompatibleProviderFields,
  toCustomModelEntries,
} from "@/components/CustomCompatibleProviderFields";
import type { ModelListRow } from "@/components/ModelListEditor";
import type { ModelsDevRow } from "@/hooks/use-models-dev";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { useAppContext } from "@/context/app-context";
import { formatError } from "@/lib/client";
import {
  apiKeyPlaceholder,
  buildConfigureProviderRequest,
  defaultModelForProvider,
  filterModelsByProvider,
  formatProviderLabel,
  getModelDisplayName,
  modelsFromCustomRows,
  PROVIDER_OPTIONS,
  type SelectedProvider,
  resolveModelForProvider,
  validateApiKeyForProvider,
  validateBaseUrlInput,
  validateCustomModelsInput,
  validateCustomOpenRouterModel,
  validateDisplayNameInput,
} from "@/lib/models";
import { InlineField } from "./provider-settings-shared";

export function SwitchProviderSection({
  currentProvider,
  catalog,
  configureProvider,
  onSuccess,
}: {
  currentProvider: SelectedProvider;
  catalog: ProviderModelOption[];
  configureProvider: ReturnType<typeof useAppContext>["configureProvider"];
  onSuccess: (message: string) => void;
}) {
  const defaultTarget =
    PROVIDER_OPTIONS.find((option) => option.id !== currentProvider)?.id ?? "openai";
  const [targetProvider, setTargetProvider] = useState<SelectedProvider>(defaultTarget);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyTouched, setApiKeyTouched] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customModelError, setCustomModelError] = useState<string | null>(null);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [customModels, setCustomModels] = useState<ModelListRow[]>([{ id: "", name: "" }]);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [baseUrlError, setBaseUrlError] = useState<string | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setTargetProvider((current: SelectedProvider) =>
      current === currentProvider
        ? (PROVIDER_OPTIONS.find((option) => option.id !== currentProvider)?.id ?? "openai")
        : current,
    );
  }, [currentProvider]);

  const targetModels = useMemo(() => {
    if (targetProvider === "openai_compatible") {
      return modelsFromCustomRows(customModels);
    }

    return filterModelsByProvider(catalog, targetProvider);
  }, [catalog, targetProvider, customModels]);

  useEffect(() => {
    if (targetModels.length === 0) {
      return;
    }

    setSelectedModel((current) => {
      if (current && targetModels.some((model) => model.id === current)) {
        return current;
      }

      return defaultModelForProvider(catalog, targetProvider);
    });
  }, [targetProvider, targetModels, catalog]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedKey = apiKey.trim();
    const nextApiKeyError = validateApiKeyForProvider(trimmedKey, targetProvider);
    const nextCustomModelError =
      targetProvider === "openrouter" ? validateCustomOpenRouterModel(customModel) : null;
    const nextDisplayNameError =
      targetProvider === "openai_compatible" ? validateDisplayNameInput(displayName) : null;
    const nextBaseUrlError =
      targetProvider === "openai_compatible" ? validateBaseUrlInput(baseUrl) : null;
    const nextModelsError =
      targetProvider === "openai_compatible" ? validateCustomModelsInput(customModels) : null;

    setApiKeyTouched(true);
    setApiKeyError(nextApiKeyError);
    setCustomModelError(nextCustomModelError);
    setDisplayNameError(nextDisplayNameError);
    setBaseUrlError(nextBaseUrlError);
    setModelsError(nextModelsError);
    setLocalError(null);

    if (nextApiKeyError) {
      document.getElementById("switch-api-key")?.focus();
      return;
    }

    if (nextCustomModelError) {
      document.getElementById("switch-custom-model")?.focus();
      return;
    }

    if (nextDisplayNameError || nextBaseUrlError || nextModelsError) {
      return;
    }

    const modelToSave = resolveModelForProvider(
      targetProvider,
      selectedModel,
      customModel,
    );

    setBusy(true);

    try {
      const result = await configureProvider(
        buildConfigureProviderRequest({
          apiKey: trimmedKey,
          provider: targetProvider,
          model: modelToSave || undefined,
          displayName,
          baseUrl,
          customModels:
            targetProvider === "openai_compatible"
              ? toCustomModelEntries(customModels)
              : undefined,
        }),
      );
      setApiKey("");
      setApiKeyTouched(false);
      setShowApiKey(false);
      setCustomModel("");
      onSuccess(
        `Switched to ${formatProviderLabel(result.provider, result.displayName)} with ${getModelDisplayName(catalog, result.currentModel)}.`,
      );
    } catch (err) {
      setLocalError(formatError(err));
      document.getElementById("switch-api-key")?.focus();
    } finally {
      setBusy(false);
    }
  };

  function handleBrowseSelect(provider: SelectedProvider, modelId: string, row: ModelsDevRow) {
    setIsBrowsing(false);
    setTargetProvider(provider);
    setLocalError(null);
    if (provider !== "openrouter") {
      setCustomModel("");
      setCustomModelError(null);
    }
    if (provider === "openrouter") {
      setCustomModel(modelId);
      setCustomModelError(null);
    } else if (provider === "openai_compatible") {
      setDisplayName(row.providerName);
      setBaseUrl(row.apiUrl.replace(/\/$/, ""));
      setCustomModels([{ id: modelId, name: row.modelName }]);
      setSelectedModel(modelId);
      if (row.isZen && row.isFree && !row.deprecated) {
        setApiKey("public");
      }
    } else {
      setSelectedModel(modelId);
    }
    if (apiKeyTouched && apiKey.trim()) {
      setApiKeyError(validateApiKeyForProvider(apiKey, provider));
    }
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
      <InlineField id="switch-provider" label="Provider">
        <Select
          value={isBrowsing ? "__browse__" : targetProvider}
          disabled={busy}
          onValueChange={(v) => {
            if (v === "__browse__") {
              setIsBrowsing(true);
            } else if (PROVIDER_OPTIONS.some((o) => o.id === v)) {
              setIsBrowsing(false);
              setTargetProvider(v as SelectedProvider);
              setLocalError(null);
              if (v !== "openrouter") {
                setCustomModel("");
                setCustomModelError(null);
              }
              if (apiKeyTouched && apiKey.trim()) {
                setApiKeyError(validateApiKeyForProvider(apiKey, v as SelectedProvider));
              }
            }
          }}
        >
          <SelectTrigger id="switch-provider" className="w-full">
            <SelectValue>
              {isBrowsing
                ? "Browse models.dev…"
                : (PROVIDER_OPTIONS.find((o) => o.id === targetProvider)?.label ?? targetProvider)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value="__browse__">Browse models.dev…</SelectItem>
          </SelectContent>
        </Select>
      </InlineField>

      {isBrowsing ? (
        <ModelsBrowseList
          onSelect={handleBrowseSelect}
          className="h-72 rounded-md border border-border"
        />
      ) : (
        <>
          {targetProvider === "openrouter" ? (
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Model</p>
              <OpenRouterModelPicker
                idPrefix="switch"
                catalogModels={targetModels}
                selectedModel={selectedModel}
                customModel={customModel}
                customModelError={customModelError}
                disabled={busy}
                density="compact"
                onSelectedModelChange={setSelectedModel}
                onCustomModelChange={(value) => {
                  setCustomModel(value);
                  setCustomModelError(validateCustomOpenRouterModel(value));
                }}
                onBrowseSelect={(row) => {
                  setCustomModel(row.id);
                  setCustomModelError(null);
                  if (targetModels.some((model) => model.id === row.id)) {
                    setSelectedModel(row.id);
                  }
                }}
              />
            </div>
          ) : (
            <InlineField id="switch-model" label="Model">
              <Select
                value={selectedModel}
                disabled={busy || targetModels.length === 0}
                onValueChange={(value) => setSelectedModel(value != null ? String(value) : "")}
              >
                <SelectTrigger id="switch-model" className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {targetModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                      {model.default ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InlineField>
          )}

          <div>
            <InlineField id="switch-api-key" label="API key">
              <InputGroup>
                <InputGroupInput
                  id="switch-api-key"
                  type={showApiKey ? "text" : "password"}
                  autoComplete="off"
                  placeholder={apiKeyPlaceholder(targetProvider)}
                  value={apiKey}
                  disabled={busy}
                  aria-invalid={apiKeyError != null}
                  aria-describedby={apiKeyError ? "switch-api-key-error" : undefined}
                  onBlur={() => {
                    setApiKeyTouched(true);
                    if (!apiKey.trim()) {
                      setApiKeyError(null);
                      return;
                    }
                    setApiKeyError(validateApiKeyForProvider(apiKey, targetProvider));
                  }}
                  onChange={(event) => {
                    const value = event.target.value;
                    setApiKey(value);
                    setLocalError(null);
                    if (apiKeyTouched && value.trim()) {
                      setApiKeyError(validateApiKeyForProvider(value, targetProvider));
                    } else if (apiKeyError) {
                      setApiKeyError(null);
                    }
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-sm"
                    aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    onClick={() => setShowApiKey((current) => !current)}
                  >
                    {showApiKey ? <EyeOffIcon /> : <EyeIcon />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </InlineField>
            {apiKeyError && (
              <p id="switch-api-key-error" className="mt-1.5 pl-27 text-sm text-destructive" role="alert">
                {apiKeyError}
              </p>
            )}
          </div>

          {targetProvider === "openai_compatible" ? (
            <CustomCompatibleProviderFields
              displayName={displayName}
              baseUrl={baseUrl}
              apiKey={apiKey}
              customModels={customModels}
              disabled={busy}
              density="compact"
              displayNameError={displayNameError}
              baseUrlError={baseUrlError}
              modelsError={modelsError}
              onDisplayNameChange={setDisplayName}
              onBaseUrlChange={setBaseUrl}
              onCustomModelsChange={setCustomModels}
            />
          ) : null}

          {localError ? (
            <p className="text-sm text-destructive" role="alert">
              {localError}
            </p>
          ) : null}

          <Button
            type="submit"
            size="sm"
            disabled={busy || (targetProvider !== "openai_compatible" && !apiKey.trim())}
          >
            {busy ? (
              <>
                <Spinner className="mr-2" />
                Switching…
              </>
            ) : (
              `Switch to ${formatProviderLabel(targetProvider)}`
            )}
          </Button>
        </>
      )}
    </form>
  );
}
