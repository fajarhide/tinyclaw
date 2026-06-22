# Profiles

A **profile** is the bot definition TinyClaw runs for a session.

It answers one practical question: **which bot should respond, and how should it behave?**

## What a profile contains

Each profile combines:

- A **name**
- An optional **model override**
- Optional **thinking settings**
- A base **system prompt**
- A **soul** file stack
- Assigned **tools**
- Assigned **MCP servers**
- Assigned **skills**
- Optional **avatar**
- Optional **knowledge base** documents

In practice, a profile is where you shape one bot for one job.

## What a good profile usually represents

In most setups, one profile maps to one clear purpose.

Examples:

- Customer support bot
- Research assistant
- Internal operations bot
- Brand voice writing bot

If one bot needs a different role, tone, tool access, or knowledge base, create another profile.

## How profiles affect replies

When a chat runs with a profile, TinyClaw builds the agent context in this order:

1. Start with the profile's `systemPrompt`
2. If soul files exist, compose them into the main system prompt
3. Append the assigned skills catalog
4. Append the knowledge base catalog
5. Expose only the tools allowed for that profile

So a profile is not just a name. It controls both:

- **How the agent behaves**
- **What the agent is allowed to do**

## Soul vs system prompt

Profiles support two layers of instruction:

- **`systemPrompt`**: quick base instructions stored in the database
- **Soul files**: richer identity files on disk

Soul files live under:

```text
~/.tinyclaw/profiles/{profileId}/
```

Supported soul files:

- `SOUL.md` for identity
- `STYLE.md` for writing voice
- `INSTRUCTIONS.md` for operating rules
- `MEMORY.md` for continuity across sessions
- `examples/*.md` for calibration examples

If you want richer personality and clearer long-term behavior, use soul files. If you only need a quick setup, the stored `systemPrompt` may be enough.

## Default behavior

System profiles such as `default` and `super_bot` are seeded by the app.

New custom profiles start with:

- Their own soul directory
- Only the builtin `create_skill` tool assigned by default

Platform admins can then assign more tools, MCP servers, and skills to make the bot more capable.

## Thinking settings

Each profile can override model thinking behavior:

- `thinkingEnabled`
- `thinkingEffort`

If a profile leaves them unset, TinyClaw falls back to the deployment defaults.

## Knowledge base and memory

Profiles keep their own context on disk:

- **Knowledge base** documents for searchable reference material
- **`MEMORY.md`** for facts and continuity saved by the agent

This matters because one profile's knowledge and memory do not automatically carry into another profile.

## Multi-tenant behavior

Profiles are tenant-owned data inside an organization. In practice:

- Profiles belong to an org
- Sessions bind to one profile
- Tool access is scoped per profile
- Profile admin actions are platform-admin only

Org admins manage org members, but they do not create or change profiles.

## When to create multiple profiles

Create separate profiles when you need different:

- Agent identities
- Safety or operating rules
- Tool access
- Knowledge bases
- Models or thinking settings

Examples:

- A general support bot
- A research bot with web search and knowledge base access
- A private internal ops bot with email and file tools
- A brand voice bot with strict style files

## Next steps

- [Builtin tools](/builtin-tools) — what each profile can do
- [Multi-tenancy](/multi-tenancy) — who can manage profiles and members
