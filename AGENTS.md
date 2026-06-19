# tinyclaw — Agent Context

A multi-agent platform (monorepo). Each profile has a **soul** — files that define the agent's identity, style, operating instructions, and continuity memory.

## Dev commands

- **Runtime:** Bun 1.3+. Use `bun install`, `bun run`, `bun test`.
- **Dev servers:** `bun run dev:server` (HTTP API), `bun run dev:web` (dashboard), `bun run dev:cli` (CLI).

There's also an `apps/` directory for server, CLI, web UI, telegram, and whatsapp apps.

## System prompt — where to make changes

The system prompt is built in three layers. Know which one to edit:

| What you want to change | File | Function |
|---|---|---|
| Static chat structure (identity, USER.md, tools, timezone, channel rules) | `packages/agent/src/chat-prompt.ts` | `buildChatSystemPrompt` |
| Soul/identity content (SOUL.md, STYLE.md, SKILL.md, MEMORY.md) | `packages/core/src/soul/compose.ts` | `composeSoulSystemPrompt` |
| Dynamic per-turn context (current date, etc.) | `packages/agent/src/chat.ts` | `generateReply` |

`generateReply` is the final dispatch point — it calls `provider.generateChat()` / `provider.streamChat()` with the assembled system prompt string.

## Soul System (`packages/core/src/soul/`)

Each profile's soul lives at `~/.tinyclaw/profiles/{profileId}/`:

| File | Purpose |
|---|---|
| `SOUL.md` | Identity |
| `STYLE.md` | Voice and writing style |
| `SKILL.md` | Operating instructions |
| `MEMORY.md` | Cross-session continuity (facts/preferences) |
| `examples/*.md` | Calibration examples |

Soul files are read by `loadSoulStack()` (`load.ts`) and injected by `composeSoulSystemPrompt()` (`compose.ts`).

## Tools (`packages/core/src/tools/`)

- `update_profile_memory` — writes to MEMORY.md
- `knowledge_base_search` — search uploaded documents
- `web_search` — web search
- `search_files` / `ripgrep` — file/content search

## Key packages

- `packages/core` — soul system, tools, contracts, types
- `packages/agent` — chat loop, prompt composition, history compaction
- `packages/db` — database layer
- `packages/client` — API client
- `packages/skills` — skill definitions

## Server notes

- HTTP runtime lives in `apps/server/src/http/app.ts` and uses Hono.
- Routes live in `apps/server/src/http/routes/*`.
- Auth and CSRF checks live in `apps/server/src/http/auth-middleware.ts` with helpers in `shared.ts`.
- OpenAPI is generated from the Hono route registration in `apps/server/src/http/openapi.ts`.
- `apps/server/openapi.json` is generated output, not the source of truth.
