import type { ProfileSummary } from "@tinyclaw/core/contract";
import { PlusIcon, RefreshCwIcon, SearchIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useProfileQuery, useProfilesQuery, useToolsQuery } from "@/hooks/use-app-queries";
import {
  useAssignToolMutation,
  useCreateProfileMutation,
  useDeleteProfileAvatarMutation,
  useDeleteProfileMutation,
  useInitProfileSoulMutation,
  useUnassignToolMutation,
  useUpdateProfileMutation,
  useUploadProfileAvatarMutation,
} from "@/hooks/use-resource-mutations";
import { cn } from "@/lib/utils";
import { fileToImageAttachment } from "@/lib/profile-images";
import { formatError } from "@/lib/client";

const defaultCreatePrompt = "You are a helpful assistant.";
const sectionClass = "rounded-md border border-border bg-card";

export function ProfilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    data: profiles = [],
    isLoading: profilesLoading,
    isFetching: profilesRefreshing,
    error: profilesError,
    refetch: refetchProfiles,
  } = useProfilesQuery();
  const { data: allTools = [] } = useToolsQuery();
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const profileInitializedRef = useRef(false);
  const {
    data: detail = null,
    isLoading: detailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useProfileQuery(selectedId);
  const createMutation = useCreateProfileMutation();
  const updateMutation = useUpdateProfileMutation();
  const deleteMutation = useDeleteProfileMutation();
  const uploadAvatarMutation = useUploadProfileAvatarMutation();
  const deleteAvatarMutation = useDeleteProfileAvatarMutation();
  const assignMutation = useAssignToolMutation();
  const unassignMutation = useUnassignToolMutation();
  const initSoulMutation = useInitProfileSoulMutation();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const createAvatarInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPrompt, setCreatePrompt] = useState(defaultCreatePrompt);
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState<string | null>(null);
  const [createToolIds, setCreateToolIds] = useState<string[]>([]);
  const [createAssignToolId, setCreateAssignToolId] = useState("");
  const [editName, setEditName] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [assignToolId, setAssignToolId] = useState("");

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    uploadAvatarMutation.isPending ||
    deleteAvatarMutation.isPending ||
    assignMutation.isPending ||
    unassignMutation.isPending ||
    initSoulMutation.isPending;

  const trimmedSearch = searchQuery.trim();
  const isSearching = trimmedSearch.length > 0;

  const isDirty = useMemo(() => {
    if (!detail) {
      return false;
    }

    return editName.trim() !== detail.name || editPrompt !== detail.systemPrompt;
  }, [detail, editName, editPrompt]);

  const setSelectedId = useCallback(
    (nextProfileId: string | null) => {
      setSelectedIdState(nextProfileId);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (nextProfileId) {
            next.set("profile", nextProfileId);
          } else {
            next.delete("profile");
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const queryError = profilesError ?? detailError;
    if (queryError) {
      setError(formatError(queryError));
    }
  }, [profilesError, detailError]);

  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedIdState(null);
      return;
    }

    if (profileInitializedRef.current) {
      if (selectedId && !profiles.some((profile) => profile.id === selectedId)) {
        setSelectedId(profiles[0]!.id);
      }
      return;
    }

    profileInitializedRef.current = true;
    const fromUrl = searchParams.get("profile");
    const matchedProfile = fromUrl ? profiles.find((profile) => profile.id === fromUrl) : null;
    const defaultProfile =
      matchedProfile ??
      profiles.find((profile) => profile.id === "profile_default") ??
      profiles[0]!;

    setSelectedId(defaultProfile.id);
  }, [profiles, searchParams, selectedId, setSelectedId]);

  useEffect(() => {
    if (detail) {
      setEditName(detail.name);
      setEditPrompt(detail.systemPrompt);
    }
  }, [detail]);

  useEffect(() => {
    return () => {
      if (createAvatarPreview) {
        URL.revokeObjectURL(createAvatarPreview);
      }
    };
  }, [createAvatarPreview]);

  const filteredProfiles = useMemo(() => {
    const query = trimmedSearch.toLowerCase();
    if (!query) {
      return profiles;
    }

    return profiles.filter((profile) => {
      return profile.name.toLowerCase().includes(query) || profile.id.toLowerCase().includes(query);
    });
  }, [profiles, trimmedSearch]);

  const availableTools = allTools.filter(
    (tool) => !detail?.tools.some((assigned) => assigned.id === tool.id),
  );

  const createAvailableTools = allTools.filter((tool) => !createToolIds.includes(tool.id));

  function handleSelectProfile(profileId: string) {
    if (profileId === selectedId) {
      return;
    }

    if (isDirty) {
      setPendingSelectionId(profileId);
      setDiscardOpen(true);
      return;
    }

    setSelectedId(profileId);
  }

  function handleDiscardChanges() {
    if (pendingSelectionId) {
      setSelectedId(pendingSelectionId);
      setPendingSelectionId(null);
    }

    setDiscardOpen(false);
  }

  function resetCreateAvatar() {
    setCreateAvatarPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setCreateAvatarFile(null);
  }

  function handleCreateAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    resetCreateAvatar();
    setCreateAvatarFile(file);
    setCreateAvatarPreview(URL.createObjectURL(file));
  }

  function handleAddCreateTool() {
    if (!createAssignToolId || createToolIds.includes(createAssignToolId)) {
      return;
    }

    setCreateToolIds((current) => [...current, createAssignToolId]);
    setCreateAssignToolId("");
  }

  function handleRemoveCreateTool(toolId: string) {
    setCreateToolIds((current) => current.filter((id) => id !== toolId));
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();

    if (!createName.trim()) {
      return;
    }

    setError(null);

    try {
      const response = await createMutation.mutateAsync({
        name: createName.trim(),
        systemPrompt: createPrompt.trim() || undefined,
      });

      if (createAvatarFile) {
        const attachment = await fileToImageAttachment(createAvatarFile);

        if (!attachment) {
          setError("Profile created, but the selected image could not be read.");
        } else {
          await uploadAvatarMutation.mutateAsync({
            profileId: response.profile.id,
            attachment,
          });
        }
      }

      for (const toolId of createToolIds) {
        await assignMutation.mutateAsync({
          profileId: response.profile.id,
          toolId,
        });
      }

      handleCreateOpenChange(false);
      setSelectedId(response.profile.id);
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function handleSave() {
    if (!selectedId || !detail) {
      return;
    }

    setError(null);

    try {
      await updateMutation.mutateAsync({
        profileId: selectedId,
        input: {
          name: editName.trim(),
          systemPrompt: editPrompt,
        },
      });
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function handleDeleteConfirm() {
    if (!selectedId || !detail || detail.isSuper) {
      return;
    }

    setError(null);

    try {
      await deleteMutation.mutateAsync(selectedId);
      setDeleteOpen(false);
      setSelectedId(null);
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function handleAssignTool() {
    if (!selectedId || !assignToolId) {
      return;
    }

    setError(null);

    try {
      await assignMutation.mutateAsync({ profileId: selectedId, toolId: assignToolId });
      setAssignToolId("");
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function handleUnassignTool(toolId: string) {
    if (!selectedId) {
      return;
    }

    setError(null);

    try {
      await unassignMutation.mutateAsync({ profileId: selectedId, toolId });
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function handleInitSoul() {
    if (!selectedId) {
      return;
    }

    setError(null);

    try {
      await initSoulMutation.mutateAsync(selectedId);
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function handleAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!selectedId || !file) {
      return;
    }

    setError(null);

    try {
      const attachment = await fileToImageAttachment(file);

      if (!attachment) {
        setError("Could not read the selected image.");
        return;
      }

      await uploadAvatarMutation.mutateAsync({ profileId: selectedId, attachment });
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function handleRemoveAvatar() {
    if (!selectedId || !detail?.hasAvatar) {
      return;
    }

    setError(null);

    try {
      await deleteAvatarMutation.mutateAsync(selectedId);
    } catch (err) {
      setError(formatError(err));
    }
  }

  function handleCreateOpenChange(open: boolean) {
    setCreateOpen(open);

    if (!open) {
      setCreateName("");
      setCreatePrompt(defaultCreatePrompt);
      setCreateToolIds([]);
      setCreateAssignToolId("");
      resetCreateAvatar();
    }
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <section className={cn(sectionClass, "overflow-hidden")}>
          <div className="flex items-center justify-between gap-2 border-b border-border p-4">
            <p className="text-sm font-medium text-foreground">Profiles</p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={profilesLoading || profilesRefreshing || busy}
                aria-label="Refresh"
                onClick={() => void refetchProfiles()}
              >
                {profilesRefreshing ? (
                  <Spinner className="size-4" />
                ) : (
                  <RefreshCwIcon className="size-4" />
                )}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setCreateOpen(true)}>
                <PlusIcon aria-hidden />
                New
              </Button>
            </div>
          </div>

          <div className="border-b border-border p-3">
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search…"
                disabled={profilesLoading || profiles.length === 0}
                className={cn("pl-9", isSearching && "pr-9")}
                aria-label="Search profiles"
              />
              {isSearching ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          {profilesLoading ? (
            <ListSkeleton rows={4} rounded={false} />
          ) : profiles.length === 0 ? (
            <EmptyMessage message="No profiles yet." actionLabel="Create one" onAction={() => setCreateOpen(true)} />
          ) : filteredProfiles.length === 0 ? (
            <EmptyMessage
              message="No profiles match your search."
              actionLabel="Clear search"
              onAction={() => setSearchQuery("")}
            />
          ) : (
            <ul className="divide-y divide-border">
              {filteredProfiles.map((profile) => (
                <li key={profile.id}>
                  <ProfileListItem
                    profile={profile}
                    selected={selectedId === profile.id}
                    disabled={busy}
                    onSelect={() => handleSelectProfile(profile.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
              {selectedId ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => void refetchDetail()}
                  >
                    Retry
                  </button>
                </>
              ) : null}
            </p>
          ) : null}

          {detailLoading && !detail ? (
            <ListSkeleton rows={6} />
          ) : detail ? (
            <>
              <section className={cn(sectionClass, "p-5")}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <ProfileAvatar profile={detail} size="lg" />
                    <div className="min-w-0">
                      <h2 className="text-base font-medium text-foreground">{detail.name}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {detail.id}
                        {detail.isSuper ? " · super" : ""}
                        {" · "}
                        soul {detail.soulActive ? "active" : "inactive"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || initSoulMutation.isPending}
                      onClick={() => void handleInitSoul()}
                    >
                      {initSoulMutation.isPending ? <Spinner className="size-4" /> : "Init soul"}
                    </Button>
                    {!detail.isSuper ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteOpen(true)}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    disabled={busy}
                    onChange={(event) => void handleAvatarSelected(event)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || uploadAvatarMutation.isPending}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {uploadAvatarMutation.isPending ? <Spinner className="size-4" /> : "Upload avatar"}
                  </Button>
                  {detail.hasAvatar ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || deleteAvatarMutation.isPending}
                      onClick={() => void handleRemoveAvatar()}
                    >
                      {deleteAvatarMutation.isPending ? <Spinner className="size-4" /> : "Remove avatar"}
                    </Button>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Name" htmlFor="profile-name">
                    <Input
                      id="profile-name"
                      value={editName}
                      disabled={busy}
                      onChange={(event) => setEditName(event.target.value)}
                    />
                  </Field>
                  <Field label="Model" htmlFor="profile-model">
                    <Input
                      id="profile-model"
                      value={detail.model ?? "inherit global"}
                      disabled
                      readOnly
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="System prompt" htmlFor="profile-prompt">
                    <Textarea
                      id="profile-prompt"
                      className="min-h-36 font-mono text-xs leading-relaxed"
                      value={editPrompt}
                      disabled={busy}
                      onChange={(event) => setEditPrompt(event.target.value)}
                    />
                  </Field>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    disabled={busy || !isDirty || !editName.trim()}
                    onClick={() => void handleSave()}
                  >
                    {updateMutation.isPending ? <Spinner className="size-4" /> : "Save"}
                  </Button>
                </div>
              </section>

              <section className={cn(sectionClass, "p-5")}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-foreground">Allowed tools</h3>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Select
                      value={assignToolId}
                      disabled={busy || availableTools.length === 0}
                      onValueChange={(value) => setAssignToolId(value != null ? String(value) : "")}
                    >
                      <SelectTrigger className="w-full sm:w-44" aria-label="Tool to assign">
                        <SelectValue placeholder="Assign tool…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTools.map((tool) => (
                          <SelectItem key={tool.id} value={tool.id}>
                            {tool.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || !assignToolId}
                      onClick={() => void handleAssignTool()}
                    >
                      Assign
                    </Button>
                  </div>
                </div>

                {detail.tools.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tools assigned.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {detail.tools.map((tool) => (
                      <li
                        key={tool.id}
                        className="flex items-start justify-between gap-3 px-4 py-3 first:rounded-t-md last:rounded-b-md"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-foreground">{tool.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{tool.description}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-muted-foreground"
                          disabled={busy}
                          onClick={() => void handleUnassignTool(tool.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <section className={cn(sectionClass, "p-8 text-center text-sm text-muted-foreground")}>
              Select a profile to edit.
            </section>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="gap-6 p-6 sm:max-w-md">
          <form className="space-y-6" onSubmit={(event) => void handleCreate(event)}>
            <DialogHeader className="gap-2">
              <DialogTitle>Create profile</DialogTitle>
              <DialogDescription>Name and system prompt for the new bot profile.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Field label="Avatar">
                <div className="flex items-center gap-3">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                    {createAvatarPreview ? (
                      <img
                        src={createAvatarPreview}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-medium text-muted-foreground">
                        {createName.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={createAvatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      disabled={busy}
                      onChange={handleCreateAvatarSelected}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => createAvatarInputRef.current?.click()}
                    >
                      Choose image
                    </Button>
                    {createAvatarPreview ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={resetCreateAvatar}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Field>
              <Field label="Name" htmlFor="create-profile-name">
                <Input
                  id="create-profile-name"
                  placeholder="Research assistant"
                  value={createName}
                  disabled={busy}
                  autoFocus
                  onChange={(event) => setCreateName(event.target.value)}
                />
              </Field>
              <Field label="System prompt" htmlFor="create-profile-prompt">
                <Textarea
                  id="create-profile-prompt"
                  className="min-h-32 font-mono text-sm"
                  value={createPrompt}
                  disabled={busy}
                  onChange={(event) => setCreatePrompt(event.target.value)}
                />
              </Field>
              <Field label="Tools">
                {allTools.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tools available.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Select
                        value={createAssignToolId}
                        disabled={busy || createAvailableTools.length === 0}
                        onValueChange={(value) =>
                          setCreateAssignToolId(value != null ? String(value) : "")
                        }
                      >
                        <SelectTrigger className="w-full" aria-label="Tool to assign">
                          <SelectValue placeholder="Assign tool…" />
                        </SelectTrigger>
                        <SelectContent>
                          {createAvailableTools.map((tool) => (
                            <SelectItem key={tool.id} value={tool.id}>
                              {tool.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={busy || !createAssignToolId}
                        onClick={handleAddCreateTool}
                      >
                        Add
                      </Button>
                    </div>
                    {createToolIds.length > 0 ? (
                      <ul className="divide-y divide-border rounded-md border border-border">
                        {createToolIds.map((toolId) => {
                          const tool = allTools.find((entry) => entry.id === toolId);
                          if (!tool) {
                            return null;
                          }

                          return (
                            <li
                              key={toolId}
                              className="flex items-center justify-between gap-2 px-3 py-2"
                            >
                              <span className="min-w-0 truncate text-sm text-foreground">
                                {tool.name}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="shrink-0 text-muted-foreground"
                                disabled={busy}
                                onClick={() => handleRemoveCreateTool(toolId)}
                              >
                                Remove
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                )}
              </Field>
            </div>

            <DialogFooter className="gap-3 border-t-0 bg-transparent p-0 pt-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => handleCreateOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !createName.trim()}>
                {createMutation.isPending ||
                uploadAvatarMutation.isPending ||
                assignMutation.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setDeleteOpen(false);
          }
        }}
      >
        <DialogContent className="gap-6 p-6 sm:max-w-md">
          <DialogHeader className="gap-3">
            <DialogTitle>Delete profile?</DialogTitle>
            <DialogDescription>
              This removes {detail?.name} and its chat history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-3 border-t-0 bg-transparent p-0 pt-2 sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void handleDeleteConfirm()}
            >
              {deleteMutation.isPending ? <Spinner className="size-4" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={discardOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDiscardOpen(false);
            setPendingSelectionId(null);
          }
        }}
      >
        <DialogContent className="gap-6 p-6 sm:max-w-md">
          <DialogHeader className="gap-3">
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>Switching profiles will lose your edits.</DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-3 border-t-0 bg-transparent p-0 pt-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDiscardOpen(false);
                setPendingSelectionId(null);
              }}
            >
              Keep editing
            </Button>
            <Button type="button" variant="destructive" onClick={handleDiscardChanges}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProfileListItem({
  profile,
  selected,
  disabled,
  onSelect,
}: {
  profile: ProfileSummary;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected ? "bg-muted" : "hover:bg-muted/50",
      )}
      onClick={onSelect}
    >
      <ProfileAvatar profile={profile} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{profile.name}</p>
        <p className="text-xs text-muted-foreground">
          {profile.toolCount} tools · soul {profile.soulActive ? "on" : "off"}
        </p>
      </div>
    </button>
  );
}

function EmptyMessage({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {actionLabel && onAction ? (
        <Button type="button" variant="link" className="mt-2 h-auto p-0" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function ListSkeleton({ rows = 4, rounded = true }: { rows?: number; rounded?: boolean }) {
  return (
    <div className={cn("divide-y divide-border", rounded && sectionClass)} aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-2 px-4 py-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted/50" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted/40" />
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-xs text-muted-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
