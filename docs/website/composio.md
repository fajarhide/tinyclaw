# Composio

Nakama integrates with [Composio](https://composio.dev) to give agents access to external SaaS tools with managed OAuth.

Nakama uses the Composio SDK (`@composio/core`) with org-admin-controlled toolkit curation — not the drop-in Composio Connect MCP flow promoted on the dashboard home page.

## API key

Nakama needs a **project API key** for the Composio SDK (`x-api-key`).

| Key | Where to find it | Used by Nakama? |
| --- | --- | --- |
| Project API key | [Composio dashboard](https://dashboard.composio.dev) → **Settings** → **Project Settings** → **API Keys** | Yes |
| MCP consumer key (`ck_…`) | Dashboard → **AI Clients** → select client | No |

See [Composio authentication docs](https://docs.composio.dev/reference/authentication) for details.

The key is stored in `~/.nakama/composio/config.ini` on the Nakama server.

## Setup

1. As an org admin, open **Integrations → Composio** and save your Composio **project API key**.
2. Confirm `/health` reports `composioAvailable: true`.
3. Enable a toolkit, click **Connect**, and complete OAuth in the browser.
4. Click **Sync tools** after connecting.
5. Assign the toolkit to a profile on the **Profiles** page.

## Tenancy model

- Connections are **org-shared**. Composio `user_id` is `nakama:org:{orgId}`.
- All org members use the same connected SaaS accounts for assigned toolkits.
- Only org admins can enable, connect, disconnect, or sync toolkits.

## Chat behavior

- Assigned Composio tools are namespaced as `composio__{toolkit}__{tool}`.
- Agents cannot self-authorize OAuth. The bundled `composio-integrations` skill teaches handoff to org admins.
- Auth failures return `COMPOSIO_NOT_CONNECTED`.

## Related docs

- [MCP servers](/mcp) — generic MCP integration (separate from Composio)
- [Integrations](/integrations) — other bridge and channel settings
