import type { ChatListItem } from "@/lib/chat-history";

const ARTIFACT_META_SUFFIX = ".nakama-meta.json";
const ARTIFACTS_SEGMENT = "/artifacts/";

export interface ChatArtifactRef {
  /** Basename for chip label (e.g. `report.md`). */
  filename: string;
  /** Path relative to the profile artifacts directory (e.g. `weekly/report.md`). */
  path: string;
  mimeType: string;
  sizeBytes: number;
  savedAt: string;
}

interface WriteFileResult {
  path?: string;
  bytesWritten?: number;
  error?: string;
}

function isWriteFileTool(message: ChatListItem): boolean {
  return message.role === "tool" && message.tool === "write_file";
}

function getWriteFileResult(message: ChatListItem): WriteFileResult | null {
  if (!isWriteFileTool(message) || message.toolResult == null) {
    return null;
  }

  if (typeof message.toolResult !== "object" || message.toolResult === null) {
    return null;
  }

  return message.toolResult as WriteFileResult;
}

function isSuccessfulWrite(message: ChatListItem): boolean {
  const result = getWriteFileResult(message);
  return result != null && typeof result.error !== "string" && typeof result.path === "string";
}

function resolvedWritePath(message: ChatListItem): string | null {
  const result = getWriteFileResult(message);
  if (!result || typeof result.error === "string" || typeof result.path !== "string") {
    return null;
  }

  return result.path;
}

function isUnderArtifactsDir(resolvedPath: string): boolean {
  return resolvedPath.includes(ARTIFACTS_SEGMENT);
}

function isArtifactMetaResolvedPath(resolvedPath: string): boolean {
  return isUnderArtifactsDir(resolvedPath) && resolvedPath.endsWith(ARTIFACT_META_SUFFIX);
}

export function toArtifactsRelativePath(resolvedPath: string): string | null {
  const markerIndex = resolvedPath.indexOf(ARTIFACTS_SEGMENT);
  if (markerIndex === -1) {
    return null;
  }

  return resolvedPath.slice(markerIndex + ARTIFACTS_SEGMENT.length);
}

function siblingContentPath(metaResolvedPath: string): string | null {
  if (!isArtifactMetaResolvedPath(metaResolvedPath)) {
    return null;
  }

  return metaResolvedPath.slice(0, -ARTIFACT_META_SUFFIX.length);
}

function parseArtifactMeta(content: unknown): Pick<ChatArtifactRef, "mimeType" | "sizeBytes" | "savedAt"> | null {
  if (typeof content !== "string" || !content.trim()) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const mimeType = typeof record.mimeType === "string" ? record.mimeType.trim() : "";
  const savedAt = typeof record.savedAt === "string" ? record.savedAt.trim() : "";
  const sizeBytes = record.sizeBytes;

  if (!mimeType || !savedAt || typeof sizeBytes !== "number" || !Number.isInteger(sizeBytes) || sizeBytes < 0) {
    return null;
  }

  return { mimeType, savedAt, sizeBytes };
}

function metaContentFromSidecarWrite(message: ChatListItem): string | null {
  const input = message.toolInput;
  if (!input || typeof input.content !== "string") {
    return null;
  }

  return input.content;
}

/**
 * Extract artifact chips from an assistant turn's tool messages.
 * Requires a same-turn content write plus matching `.nakama-meta.json` sidecar write.
 */
export function extractTurnArtifacts(messages: ChatListItem[]): ChatArtifactRef[] {
  const contentWrites = new Map<string, string>();

  for (const message of messages) {
    if (!isSuccessfulWrite(message)) {
      continue;
    }

    const resolvedPath = resolvedWritePath(message);
    if (!resolvedPath || !isUnderArtifactsDir(resolvedPath) || isArtifactMetaResolvedPath(resolvedPath)) {
      continue;
    }

    const relativePath = toArtifactsRelativePath(resolvedPath);
    if (relativePath) {
      contentWrites.set(resolvedPath, relativePath);
    }
  }

  const artifacts: ChatArtifactRef[] = [];
  const seenPaths = new Set<string>();

  for (const message of messages) {
    if (!isSuccessfulWrite(message) || message.toolStatus === "running") {
      continue;
    }

    const resolvedPath = resolvedWritePath(message);
    if (!resolvedPath || !isArtifactMetaResolvedPath(resolvedPath)) {
      continue;
    }

    const siblingPath = siblingContentPath(resolvedPath);
    if (!siblingPath) {
      continue;
    }

    const relativePath = contentWrites.get(siblingPath);
    if (!relativePath) {
      continue;
    }

    const meta = parseArtifactMeta(metaContentFromSidecarWrite(message));
    if (!meta) {
      continue;
    }

    if (seenPaths.has(relativePath)) {
      continue;
    }

    seenPaths.add(relativePath);
    const filename = relativePath.split("/").pop() ?? relativePath;
    artifacts.push({
      filename,
      path: relativePath,
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
      savedAt: meta.savedAt,
    });
  }

  return artifacts;
}

export function isTextArtifactMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/javascript" ||
    mimeType === "application/xml"
  );
}

export function buildArtifactContentUrl(profileId: string, artifactPath: string, inline = false): string {
  const query = new URLSearchParams({ path: artifactPath });
  if (inline) {
    query.set("inline", "1");
  }

  return `/v1/profiles/${encodeURIComponent(profileId)}/artifacts/content?${query.toString()}`;
}
