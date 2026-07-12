import { describe, expect, test } from "bun:test";
import {
  buildComposioConnectTools,
  buildComposioToolDefinitions,
  composioConnectionKey,
  namespacedComposioToolName,
  resolveComposioCallbackBaseUrl,
} from "./composio-tool-bridge";
import type { ComposioService } from "./composio-service";
import { McpClientManager } from "./mcp-client-manager";

describe("composio-tool-bridge", () => {
  test("namespaces composio tools", () => {
    expect(namespacedComposioToolName("gmail", "GMAIL_SEND_EMAIL")).toBe(
      "composio__gmail__GMAIL_SEND_EMAIL",
    );
  });

  test("connection key includes user id", () => {
    expect(composioConnectionKey("org_1", "usr_a", "profile_1")).toBe(
      "composio:org_1:usr_a:profile_1",
    );
  });

  test("filters meta tools and disconnected assignments", async () => {
    const composioService = {
      isAvailable: async () => true,
      async getAssignedToolkitRecords() {
        return [
          {
            orgToolkit: {
              id: "ctk_1",
              orgId: "org_1",
              toolkitSlug: "gmail",
              displayName: "Gmail",
              status: "enabled",
              cachedTools: [
                {
                  slug: "GMAIL_SEND_EMAIL",
                  name: "Send Email",
                  description: "Send",
                  inputSchema: { type: "object", properties: {} },
                },
                {
                  slug: "COMPOSIO_MANAGE_CONNECTIONS",
                  name: "Manage",
                  description: "Manage",
                  inputSchema: { type: "object", properties: {} },
                },
              ],
              lastError: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
            userConnection: {
              id: "cuc_1",
              orgId: "org_1",
              userId: "usr_1",
              toolkitId: "ctk_1",
              status: "connected",
              connectedAccountId: "ca_1",
              sessionIdEnc: null,
              oauthStateHash: null,
              lastError: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
            allowedActions: null,
          },
        ];
      },
      async getProfileSessionEndpoint() {
        return {
          sessionId: "sess_1",
          url: "https://mcp.example.com",
          headers: {},
        };
      },
    } as unknown as ComposioService;

    const manager = new McpClientManager();
    manager.connectHttpEndpoint = async () => [];
    manager.isHttpEndpointConnected = () => true;
    manager.callHttpEndpointTool = async () => ({ ok: true });

    const tools = await buildComposioToolDefinitions(
      "org_1",
      "usr_1",
      "profile_1",
      composioService,
      manager,
    );

    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe("composio__gmail__GMAIL_SEND_EMAIL");
  });

  test("returns no tools when user id is missing", async () => {
    const composioService = {
      isAvailable: async () => true,
    } as unknown as ComposioService;
    const manager = new McpClientManager();

    const tools = await buildComposioToolDefinitions(
      "org_1",
      "",
      "profile_1",
      composioService,
      manager,
    );

    expect(tools).toEqual([]);
  });

  test("exposes connect tool when assigned toolkit is not connected", async () => {
    const composioService = {
      isAvailable: async () => true,
      async getAssignedToolkitRecords() {
        return [
          {
            orgToolkit: {
              id: "ctk_1",
              orgId: "org_1",
              toolkitSlug: "gmail",
              displayName: "Gmail",
              status: "enabled",
              cachedTools: [
                {
                  slug: "GMAIL_SEND_EMAIL",
                  name: "Send Email",
                  description: "Send",
                  inputSchema: { type: "object", properties: {} },
                },
              ],
              lastError: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
            userConnection: null,
            allowedActions: null,
          },
        ];
      },
      async connectToolkit() {
        return { redirectUrl: "https://oauth.example.com/authorize" };
      },
    } as unknown as ComposioService;

    const tools = await buildComposioConnectTools(
      "org_1",
      "usr_1",
      "profile_1",
      composioService,
      "http://localhost:3003",
    );

    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe("composio__connect_account");

    const result = await tools[0]?.run({ toolkit_slug: "gmail" }, {});
    expect(result).toMatchObject({
      toolkitSlug: "gmail",
      displayName: "Gmail",
      redirectUrl: "https://oauth.example.com/authorize",
    });
  });

  test("resolveComposioCallbackBaseUrl prefers NAKAMA_WEB_PUBLIC_URL", () => {
    const previous = process.env.NAKAMA_WEB_PUBLIC_URL;
    process.env.NAKAMA_WEB_PUBLIC_URL = "https://app.example.com/";

    try {
      expect(resolveComposioCallbackBaseUrl()).toBe("https://app.example.com");
    } finally {
      if (previous === undefined) {
        delete process.env.NAKAMA_WEB_PUBLIC_URL;
      } else {
        process.env.NAKAMA_WEB_PUBLIC_URL = previous;
      }
    }
  });
});
