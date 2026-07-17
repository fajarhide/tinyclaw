"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";
import type { LinkSafetyModalProps } from "streamdown";

import { Button } from "@/components/ui/button";
import { splitExternalUrl } from "@/lib/external-link-url";

const LEARN_MORE_HREF =
  "https://www.cisa.gov/secure-our-world/recognize-and-report-phishing";

export function ExternalLinkSafetyModal({
  url,
  isOpen,
  onClose,
  onConfirm,
}: LinkSafetyModalProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { prefix, host, suffix } = splitExternalUrl(url);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in some contexts.
    }
  }

  function handleConfirm() {
    onConfirm();
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"
      data-streamdown="link-safety-modal"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div
        aria-describedby="external-link-safety-description"
        aria-labelledby="external-link-safety-title"
        aria-modal="true"
        className="relative mx-4 flex w-full max-w-md flex-col gap-3 rounded-3xl border bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3">
          <p
            className="m-0 text-lg leading-none font-semibold text-foreground"
            id="external-link-safety-title"
          >
            External site
          </p>
          <button
            className="-m-1.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="flex flex-col gap-2 py-4">
          <p
            className="m-0 text-sm leading-snug text-muted-foreground"
            id="external-link-safety-description"
          >
            Verify this link is where you&apos;d like to go.{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href={LEARN_MORE_HREF}
              rel="noreferrer"
              target="_blank"
            >
              Learn more
            </a>
          </p>

          <p className="m-0 break-all text-sm leading-snug pt-2">
            <span className="text-muted-foreground">{prefix}</span>
            <span className="font-semibold text-foreground">{host}</span>
            <span className="text-muted-foreground">{suffix}</span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            className="h-9 rounded-full border px-4 leading-none"
            onClick={() => void handleCopy()}
            type="button"
            variant="outline"
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button
            className="h-9 rounded-full px-4 leading-none"
            onClick={handleConfirm}
            type="button"
          >
            Open link
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
