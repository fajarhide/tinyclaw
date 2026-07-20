import { MessageResponse } from "@/components/ai-elements/message";
import { Spinner } from "@/components/ui/spinner";
import type { ChatArtifactRef } from "@/lib/chat-artifacts";
import {
  ARTIFACT_HTML_IFRAME_SANDBOX,
  htmlForArtifactPreview,
} from "@/lib/artifact-html-preview";

/** Highlighting a very large file blocks the main thread, so show it as plain text. */
const MAX_HIGHLIGHTED_CHARS = 200_000;

function toCodeFence(content: string, language: string): string {
  const longestRun = Math.max(0, ...[...content.matchAll(/`+/g)].map((match) => match[0].length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}${language}\n${content}\n${fence}`;
}

function renderTextContent({
  content,
  isMarkdown,
  language,
  streaming = false,
}: {
  content: string;
  isMarkdown: boolean;
  language: string | null;
  streaming?: boolean;
}) {
  if (isMarkdown) {
    return (
      <MessageResponse className="text-sm" isAnimating={streaming}>
        {content}
      </MessageResponse>
    );
  }

  if (language && content.length <= MAX_HIGHLIGHTED_CHARS) {
    return (
      <MessageResponse className="text-sm" isAnimating={streaming}>
        {toCodeFence(content, language)}
      </MessageResponse>
    );
  }

  return (
    <pre className="max-h-[min(50vh,28rem)] overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap text-foreground">
      {content}
    </pre>
  );
}

export function ArtifactAttachmentPanelBody({
  isHtml,
  isImage = false,
  isMarkdown,
  language,
  loading,
  error,
  content,
  imagePreviewUrl = null,
  canPreview,
  artifact,
  streaming = false,
  htmlSandbox = ARTIFACT_HTML_IFRAME_SANDBOX,
}: {
  isHtml: boolean;
  isImage?: boolean;
  isMarkdown: boolean;
  language: string | null;
  loading: boolean;
  error: string | null;
  content: string | null;
  imagePreviewUrl?: string | null;
  canPreview: boolean;
  artifact: ChatArtifactRef;
  streaming?: boolean;
  htmlSandbox?: string;
}) {
  if (isImage) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Loading preview…
          </div>
        ) : null}

        {error ? <p className="p-4 text-sm text-destructive">{error}</p> : null}

        {!loading && !error && imagePreviewUrl ? (
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <img
              src={imagePreviewUrl}
              alt={artifact.filename}
              className="max-h-[min(70vh,48rem)] max-w-full rounded-lg border border-border bg-muted/20 object-contain"
            />
          </div>
        ) : null}

        {!loading && !error && !imagePreviewUrl && !canPreview ? (
          <p className="p-4 text-sm text-muted-foreground">
            Preview is not available for this file type. Download the artifact instead.
          </p>
        ) : null}
      </div>
    );
  }

  if (isHtml) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Loading preview…
          </div>
        ) : null}

        {error ? <p className="p-4 text-sm text-destructive">{error}</p> : null}

        {!loading && !error && content ? (
          <iframe
            title={artifact.filename}
            srcDoc={htmlForArtifactPreview(content)}
            sandbox={htmlSandbox}
            className="min-h-0 w-full flex-1 border-0 bg-background"
          />
        ) : null}

        {!loading && !error && !content && !canPreview ? (
          <p className="p-4 text-sm text-muted-foreground">
            Preview is not available for this file type. Download the artifact instead.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading preview…
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !error && content
        ? renderTextContent({
            content,
            isMarkdown,
            language,
            streaming,
          })
        : null}

      {!loading && !error && !canPreview ? (
        <p className="text-sm text-muted-foreground">
          Preview is not available for this file type. Download the artifact instead.
        </p>
      ) : null}
    </div>
  );
}
