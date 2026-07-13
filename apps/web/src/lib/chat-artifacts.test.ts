import { describe, expect, test } from "bun:test";
import type { ChatListItem } from "@/lib/chat-history";
import { extractTurnArtifacts, toArtifactsRelativePath } from "./chat-artifacts";

const ARTIFACTS_ROOT = "/Users/test/.nakama/orgs/org_1/profiles/profile_1/artifacts";

function writeFileTool(
  id: string,
  input: { path: string; content: string },
  result: { path: string; bytesWritten: number } | { error: string },
  toolStatus: "running" | "done" = "done",
): ChatListItem {
  return {
    id: `tool-${id}`,
    role: "tool",
    content: "",
    toolCallId: id,
    tool: "write_file",
    toolStatus,
    toolInput: input,
    toolResult: result,
  };
}

const metaJson = JSON.stringify({
  mimeType: "text/markdown",
  savedAt: "2026-07-13T10:00:00.000Z",
  sizeBytes: 42,
});

describe("extractTurnArtifacts", () => {
  test("pairs content and sidecar writes into one artifact ref", () => {
    const contentPath = `${ARTIFACTS_ROOT}/report.md`;
    const sidecarPath = `${ARTIFACTS_ROOT}/report.md.nakama-meta.json`;

    const messages: ChatListItem[] = [
      writeFileTool("1", { path: "artifacts/report.md", content: "# Report" }, {
        path: contentPath,
        bytesWritten: 8,
      }),
      writeFileTool("2", { path: "artifacts/report.md.nakama-meta.json", content: metaJson }, {
        path: sidecarPath,
        bytesWritten: metaJson.length,
      }),
    ];

    expect(extractTurnArtifacts(messages)).toEqual([
      {
        filename: "report.md",
        path: "report.md",
        mimeType: "text/markdown",
        sizeBytes: 42,
        savedAt: "2026-07-13T10:00:00.000Z",
      },
    ]);
  });

  test("supports nested artifact paths", () => {
    const contentPath = `${ARTIFACTS_ROOT}/weekly/report.md`;
    const sidecarPath = `${ARTIFACTS_ROOT}/weekly/report.md.nakama-meta.json`;

    const messages: ChatListItem[] = [
      writeFileTool("1", { path: "artifacts/weekly/report.md", content: "# Weekly" }, {
        path: contentPath,
        bytesWritten: 8,
      }),
      writeFileTool("2", { path: "artifacts/weekly/report.md.nakama-meta.json", content: metaJson }, {
        path: sidecarPath,
        bytesWritten: metaJson.length,
      }),
    ];

    expect(extractTurnArtifacts(messages)).toEqual([
      expect.objectContaining({
        filename: "report.md",
        path: "weekly/report.md",
      }),
    ]);
  });

  test("returns empty when only content is written", () => {
    const contentPath = `${ARTIFACTS_ROOT}/report.md`;

    expect(
      extractTurnArtifacts([
        writeFileTool("1", { path: "artifacts/report.md", content: "# Report" }, {
          path: contentPath,
          bytesWritten: 8,
        }),
      ]),
    ).toEqual([]);
  });

  test("returns empty when only sidecar is written", () => {
    const sidecarPath = `${ARTIFACTS_ROOT}/report.md.nakama-meta.json`;

    expect(
      extractTurnArtifacts([
        writeFileTool("1", { path: "artifacts/report.md.nakama-meta.json", content: metaJson }, {
          path: sidecarPath,
          bytesWritten: metaJson.length,
        }),
      ]),
    ).toEqual([]);
  });

  test("returns empty when sidecar write fails", () => {
    const contentPath = `${ARTIFACTS_ROOT}/report.md`;

    expect(
      extractTurnArtifacts([
        writeFileTool("1", { path: "artifacts/report.md", content: "# Report" }, {
          path: contentPath,
          bytesWritten: 8,
        }),
        writeFileTool("2", { path: "artifacts/report.md.nakama-meta.json", content: metaJson }, {
          error: "write failed",
        }),
      ]),
    ).toEqual([]);
  });

  test("rejects invalid sidecar JSON", () => {
    const contentPath = `${ARTIFACTS_ROOT}/report.md`;
    const sidecarPath = `${ARTIFACTS_ROOT}/report.md.nakama-meta.json`;

    expect(
      extractTurnArtifacts([
        writeFileTool("1", { path: "artifacts/report.md", content: "# Report" }, {
          path: contentPath,
          bytesWritten: 8,
        }),
        writeFileTool("2", { path: "artifacts/report.md.nakama-meta.json", content: "{bad" }, {
          path: sidecarPath,
          bytesWritten: 4,
        }),
      ]),
    ).toEqual([]);
  });

  test("ignores meta files written outside artifacts", () => {
    const outsidePath = "/Users/test/.nakama/orgs/org_1/profiles/profile_1/notes.nakama-meta.json";

    expect(
      extractTurnArtifacts([
        writeFileTool("1", { path: "notes.nakama-meta.json", content: metaJson }, {
          path: outsidePath,
          bytesWritten: metaJson.length,
        }),
      ]),
    ).toEqual([]);
  });

  test("emits two refs for two full pairs in one turn", () => {
    const messages: ChatListItem[] = [
      writeFileTool("1", { path: "artifacts/a.md", content: "a" }, {
        path: `${ARTIFACTS_ROOT}/a.md`,
        bytesWritten: 1,
      }),
      writeFileTool("2", { path: "artifacts/a.md.nakama-meta.json", content: metaJson }, {
        path: `${ARTIFACTS_ROOT}/a.md.nakama-meta.json`,
        bytesWritten: metaJson.length,
      }),
      writeFileTool("3", { path: "artifacts/b.md", content: "b" }, {
        path: `${ARTIFACTS_ROOT}/b.md`,
        bytesWritten: 1,
      }),
      writeFileTool("4", { path: "artifacts/b.md.nakama-meta.json", content: metaJson }, {
        path: `${ARTIFACTS_ROOT}/b.md.nakama-meta.json`,
        bytesWritten: metaJson.length,
      }),
    ];

    expect(extractTurnArtifacts(messages)).toHaveLength(2);
  });

  test("emits artifacts-relative paths only", () => {
    const contentPath = `${ARTIFACTS_ROOT}/weekly/report.md`;

    const [artifact] = extractTurnArtifacts([
      writeFileTool("1", { path: "artifacts/weekly/report.md", content: "# Weekly" }, {
        path: contentPath,
        bytesWritten: 8,
      }),
      writeFileTool("2", { path: "artifacts/weekly/report.md.nakama-meta.json", content: metaJson }, {
        path: `${ARTIFACTS_ROOT}/weekly/report.md.nakama-meta.json`,
        bytesWritten: metaJson.length,
      }),
    ]);

    expect(artifact?.path).toBe("weekly/report.md");
    expect(artifact?.path.startsWith("/")).toBe(false);
  });
});

describe("toArtifactsRelativePath", () => {
  test("strips the artifacts directory prefix", () => {
    expect(toArtifactsRelativePath(`${ARTIFACTS_ROOT}/weekly/report.md`)).toBe("weekly/report.md");
  });
});
