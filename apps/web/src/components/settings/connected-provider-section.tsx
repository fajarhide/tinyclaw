import type { ProviderModelOption } from "@tinyclaw/core/contract";
import { useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { OpenRouterModelsBrowseList } from "@/components/OpenRouterModelsBrowseList";
import { OpenRouterProviderModelFields } from "@/components/OpenRouterProviderModelFields";
import {
  CustomCompatibleProviderFields,
  toCustomModelEntries,
} from "@/components/CustomCompatibleProviderFields";
import type { ModelListRow } from "@/components/ModelListEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  formatProviderLabel,
  type SelectedProvider,
  validateOpenRouterModelsInput,
} from "@/lib/models";
import { seedManageModelRows, SettingsRow } from "./provider-settings-shared";

export function ConnectedProviderSection({
  models,
  configureProvider,
  configuredModels,
  modelDraft,
  modelBusy,
  modelDirty,
  modelSaveHint,
  formError,
  replaceKeyOpen,
  apiKey,
  showApiKey,
  apiKeyError,
  replaceKeyBusy,
  onModelDraftChange,
  onSaveModel,
  onOpenReplaceKey,
  onCancelReplaceKey,
  onApiKeyChange,
  onApiKeyBlur,
  onToggleShowApiKey,
  onSubmitReplaceKey,
}: {
  models: NonNullable<ReturnType<typeof useAppContext>["models"]>;
  configureProvider: ReturnType<typeof useAppContext>["configureProvider"];
  configuredModels: ProviderModelOption[];
  modelDraft: string;
  modelBusy: boolean;
  modelDirty: boolean;
  modelSaveHint: string | null;
  formError: string | null;
  replaceKeyOpen: boolean;
  apiKey: string;
  showApiKey: boolean;
  apiKeyError: string | null;
  replaceKeyBusy: boolean;
  onModelDraftChange: (value: string) => void;
  onSaveModel: () => void;
  onOpenReplaceKey: () => void;
  onCancelReplaceKey: () => void;
  onApiKeyChange: (value: string) => void;
  onApiKeyBlur: () => void;
  onToggleShowApiKey: () => void;
  onSubmitReplaceKey: (event: React.FormEvent) => void;
}) {
  const currentProvider = models.provider as SelectedProvider;
  const isCompatible = currentProvider === "openai_compatible";
  const isOpenRouter = currentProvider === "openrouter";
  const [browseOpen, setBrowseOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(models.displayName ?? "");
  const [editBaseUrl, setEditBaseUrl] = useState(models.baseUrl ?? "");
  const [manageModels, setManageModels] = useState<ModelListRow[]>(
    (models.customModels ?? []).map((model) => ({
      id: model.id,
      name: model.name ?? model.id,
      default: model.default,
      inputPerMillionUsd: model.inputPerMillionUsd,
      outputPerMillionUsd: model.outputPerMillionUsd,
    })),
  );
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    if (isCompatible || isOpenRouter) {
      setManageModels(seedManageModelRows(models.customModels, configuredModels));
    }
  }, [models.customModels, configuredModels, isCompatible, isOpenRouter]);

  const currentModelName =
    configuredModels.find((model) => model.id === models.currentModel)?.name ??
    models.currentModel;

  const saveCompatibleConfig = async (patch: {
    displayName?: string;
    baseUrl?: string;
    customModels?: ReturnType<typeof toCustomModelEntries>;
  }) => {
    setDialogBusy(true);
    setDialogError(null);

    try {
      await configureProvider(
        buildConfigureProviderRequest({
          apiKey: "",
          provider: "openai_compatible",
          model: models.currentModel ?? undefined,
          displayName: patch.displayName ?? models.displayName ?? "",
          baseUrl: patch.baseUrl ?? models.baseUrl ?? "",
          customModels: patch.customModels ?? models.customModels,
        }),
      );
      setEditOpen(false);
      setManageOpen(false);
    } catch (error) {
      setDialogError(formatError(error));
    } finally {
      setDialogBusy(false);
    }
  };

  const saveOpenRouterConfig = async () => {
    const modelsError = validateOpenRouterModelsInput(manageModels);
    if (modelsError) {
      setDialogError(modelsError);
      return;
    }

    setDialogBusy(true);
    setDialogError(null);

    try {
      await configureProvider(
        buildConfigureProviderRequest({
          apiKey: "",
          provider: "openrouter",
          model: models.currentModel ?? undefined,
          customModels: toCustomModelEntries(manageModels),
        }),
      );
      setManageOpen(false);
    } catch (error) {
      setDialogError(formatError(error));
    } finally {
      setDialogBusy(false);
    }
  };

  return (
    <div className="divide-y divide-border">
      <div className="px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-foreground">Provider</p>
          <p className="text-xs text-muted-foreground">
            {formatProviderLabel(currentProvider, models.displayName)} · {currentModelName}
          </p>
        </div>
      </div>

      {isCompatible ? (
        <SettingsRow label="Endpoint" description={models.baseUrl ?? "—"}>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        </SettingsRow>
      ) : null}

      {isCompatible || isOpenRouter ? (
        <SettingsRow
          label="Models"
          description={
            isOpenRouter
              ? models.customModels?.length
                ? `${models.customModels.length} in shortlist`
                : `${configuredModels.length} built-in models`
              : `${models.customModels?.length ?? 0} models configured`
          }
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setDialogError(null);
              setManageModels(seedManageModelRows(models.customModels, configuredModels));
              setManageOpen(true);
            }}
          >
            Manage
          </Button>
        </SettingsRow>
      ) : null}

      <SettingsRow
        label="Model"
        description={
          modelSaveHint ? (
            <span className="text-emerald-200" role="status">
              {modelSaveHint}
            </span>
          ) : (
            "Chat history resets when you change models"
          )
        }
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select
            value={modelDraft}
            disabled={modelBusy || configuredModels.length === 0}
            onValueChange={(value) => onModelDraftChange(value != null ? String(value) : "")}
          >
            <SelectTrigger id="connected-model" className="w-44 sm:w-52">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent align="end">
              {configuredModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                  {model.default ? " (default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOpenRouter ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={modelBusy}
              onClick={() => setBrowseOpen(true)}
            >
              Browse
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={modelBusy || !modelDraft || !modelDirty}
            onClick={onSaveModel}
          >
            {modelBusy ? (
              <>
                <Spinner className="mr-2" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </SettingsRow>

      {isOpenRouter ? (
        <Dialog open={browseOpen} onOpenChange={setBrowseOpen}>
          <DialogContent className="w-[min(96vw,42rem)] sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Browse OpenRouter models</DialogTitle>
              <DialogDescription>
                Pick a model, then click Save on the Model row to apply it.
              </DialogDescription>
            </DialogHeader>
            <OpenRouterModelsBrowseList
              onSelect={(row) => {
                onModelDraftChange(row.id);
                setBrowseOpen(false);
              }}
              className="h-80 rounded-md border border-border"
            />
          </DialogContent>
        </Dialog>
      ) : null}

      <SettingsRow label="API key" description="Saved on the server">
        <Button type="button" size="sm" variant="outline" onClick={onOpenReplaceKey}>
          Replace key
        </Button>
      </SettingsRow>

      <Dialog
        open={replaceKeyOpen}
        onOpenChange={(open) => {
          if (!open) {
            onCancelReplaceKey();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form className="space-y-4" onSubmit={onSubmitReplaceKey}>
            <DialogHeader>
              <DialogTitle>
                Replace API key
                {isCompatible && models.displayName ? ` for ${models.displayName}` : ""}
              </DialogTitle>
              <DialogDescription>
                Paste a new key from your{" "}
                {formatProviderLabel(currentProvider, models.displayName)} dashboard. The current
                model stays the same.
              </DialogDescription>
            </DialogHeader>

            <InputGroup>
              <InputGroupInput
                id="replace-api-key"
                type={showApiKey ? "text" : "password"}
                autoComplete="off"
                placeholder={apiKeyPlaceholder(currentProvider)}
                value={apiKey}
                disabled={replaceKeyBusy}
                aria-invalid={apiKeyError != null}
                aria-describedby={apiKeyError ? "replace-api-key-error" : undefined}
                onBlur={onApiKeyBlur}
                onChange={(event) => onApiKeyChange(event.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                  onClick={onToggleShowApiKey}
                >
                  {showApiKey ? <EyeOffIcon /> : <EyeIcon />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>

            {apiKeyError ? (
              <p id="replace-api-key-error" className="text-sm text-destructive" role="alert">
                {apiKeyError}
              </p>
            ) : null}
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={replaceKeyBusy}
                onClick={onCancelReplaceKey}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={replaceKeyBusy || !apiKey.trim()}>
                {replaceKeyBusy ? (
                  <>
                    <Spinner className="mr-2" />
                    Saving…
                  </>
                ) : (
                  "Save key"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isCompatible ? (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-[min(96vw,56rem)] sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit provider</DialogTitle>
            </DialogHeader>
            <CustomCompatibleProviderFields
              displayName={editDisplayName}
              baseUrl={editBaseUrl}
              apiKey=""
              customModels={manageModels}
              disabled={dialogBusy}
              displayNameError={null}
              baseUrlError={null}
              modelsError={null}
              onDisplayNameChange={setEditDisplayName}
              onBaseUrlChange={setEditBaseUrl}
              onCustomModelsChange={setManageModels}
            />
            {dialogError ? (
              <p className="text-sm text-destructive" role="alert">
                {dialogError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                disabled={dialogBusy}
                onClick={() =>
                  void saveCompatibleConfig({
                    displayName: editDisplayName,
                    baseUrl: editBaseUrl,
                    customModels: toCustomModelEntries(manageModels),
                  })
                }
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {isCompatible ? (
        <Dialog open={manageOpen} onOpenChange={setManageOpen}>
          <DialogContent className="w-[min(96vw,56rem)] sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Manage models</DialogTitle>
            </DialogHeader>
            <CustomCompatibleProviderFields
              displayName={models.displayName ?? ""}
              baseUrl={models.baseUrl ?? ""}
              apiKey=""
              customModels={manageModels}
              disabled={dialogBusy}
              displayNameError={null}
              baseUrlError={null}
              modelsError={null}
              onDisplayNameChange={() => {}}
              onBaseUrlChange={() => {}}
              onCustomModelsChange={setManageModels}
            />
            {dialogError ? (
              <p className="text-sm text-destructive" role="alert">
                {dialogError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                disabled={dialogBusy}
                onClick={() =>
                  void saveCompatibleConfig({
                    customModels: toCustomModelEntries(manageModels),
                  })
                }
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {isOpenRouter ? (
        <Dialog
          open={manageOpen}
          onOpenChange={(open) => {
            setManageOpen(open);
            if (!open) {
              setDialogError(null);
            }
          }}
        >
          <DialogContent className="w-[min(96vw,56rem)] sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Manage models</DialogTitle>
              <DialogDescription>
                Add or remove models from your shortlist. After you save, only these models appear
                in the model picker.
              </DialogDescription>
            </DialogHeader>
            <OpenRouterProviderModelFields
              customModels={manageModels}
              disabled={dialogBusy}
              modelsError={dialogError}
              onCustomModelsChange={(rows) => {
                setManageModels(rows);
                if (dialogError) {
                  setDialogError(null);
                }
              }}
            />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={dialogBusy} onClick={() => setManageOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={dialogBusy} onClick={() => void saveOpenRouterConfig()}>
                {dialogBusy ? (
                  <>
                    <Spinner className="mr-2" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
