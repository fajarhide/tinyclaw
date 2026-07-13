import { useEffect, useState } from "react";
import { FileDownIcon, FileTextIcon } from "lucide-react";
import { AttachmentDetailPanel } from "@/components/chat/attachment-detail-panel";
import { Spinner } from "@/components/ui/spinner";
import {
  buildArtifactContentUrl,
  isTextArtifactMimeType,
  type ChatArtifactRef,
} from "@/lib/chat-artifacts";
import { client, formatError } from "@/lib/client";
import { formatBytes } from "@/lib/knowledge-base-files";
import { cn } from "@/lib/utils";

interface ArtifactAttachmentPreviewProps {
  profileId: string;
  artifact: ChatArtifactRef;
  className?: string;
}

export function ArtifactAttachmentPreview({
  profileId,
  artifact,
  className,
}: ArtifactAttachmentPreviewProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const downloadUrl = `${client.baseUrl}${buildArtifactContentUrl(profileId, artifact.path)}`;
  const canPreview = isTextArtifactMimeType(artifact.mimeType);

  useEffect(() => {
    if (!open || !canPreview) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);

    void client
      .readProfileArtifactContent(profileId, artifact.path, { inline: true })
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (!isTextArtifactMimeType(result.contentType)) {
          setError("Preview is not available for this file type. Download instead.");
          return;
        }

        setContent(new TextDecoder().decode(result.data));
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(formatError(fetchError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, canPreview, profileId, artifact.path]);

  return (
    <>
      <button
        type="button"
        className={cn(
          "relative inline-flex max-w-full shrink-0 items-center gap-2 rounded-lg border border-border bg-muted px-2 py-2 text-left transition-colors hover:bg-muted/70",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
          <FileTextIcon className="size-4 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0 max-w-[12rem]">
          <p className="truncate text-xs font-medium text-foreground">{artifact.filename}</p>
          <p className="text-[10px] text-muted-foreground">
            {formatBytes(artifact.sizeBytes)} · Artifact
          </p>
        </div>
      </button>

      <AttachmentDetailPanel open={open} onOpenChange={setOpen} title={artifact.filename}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{artifact.mimeType}</span>
            <span>·</span>
            <span>{formatBytes(artifact.sizeBytes)}</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading preview…
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!loading && !error && content ? (
            <pre className="max-h-[min(50vh,28rem)] overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap text-foreground">
              {content}
            </pre>
          ) : null}

          {!loading && !error && !canPreview ? (
            <p className="text-sm text-muted-foreground">
              Preview is not available for this file type. Download the artifact instead.
            </p>
          ) : null}

          <a
            href={downloadUrl}
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            <FileDownIcon className="size-4" aria-hidden />
            Download
          </a>
        </div>
      </AttachmentDetailPanel>
    </>
  );
}
