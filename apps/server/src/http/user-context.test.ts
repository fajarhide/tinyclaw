import { describe, expect, test } from "bun:test";
import { createHonoApp } from "./app";
import { AuthService } from "../services/auth-service";
import { OrgService } from "../services/org-service";
import { AgentService } from "../services/agent-service";
import { createInMemoryDatabaseAdapter } from "@tinyclaw/db";
import { buildSetupAuthBody } from "./test-org-helpers";

function extractSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  return headers.getSetCookie?.() ?? (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);
}

function cookieHeaderFromSetCookies(setCookies: string[]): string {
  const session = setCookies.find((entry) => entry.startsWith("tinyclaw_session="));
  const csrf = setCookies.find((entry) => entry.startsWith("tinyclaw_csrf="));
  return [session, csrf].filter(Boolean).map((entry) => entry!.split(";")[0]).join("; ");
}

function cookieValue(setCookies: string[], name: string): string {
  const cookie = setCookies.find((entry) => entry.startsWith(`${name}=`));
  if (!cookie) {
    throw new Error(`Missing cookie: ${name}`);
  }

  return cookie.split(";")[0]!.split("=", 2)[1]!;
}

describe("user context routes", () => {
  test("stores USER.md per authenticated member", async () => {
    const databaseAdapter = createInMemoryDatabaseAdapter();
    const authService = new AuthService();
    const app = createHonoApp({
      agent: new AgentService(null, null, databaseAdapter),
      automationService: {} as any,
      taskService: {} as any,
      systemStatus: { getStatus: async () => ({ ok: true }) } as any,
      workerManager: {} as any,
      mcpService: {} as any,
      authService,
      orgService: new OrgService(databaseAdapter, authService),
      databaseAdapter,
      webDistDir: null,
    });

    const setupResponse = await app.fetch(
      new Request("http://localhost:4310/v1/auth/setup", {
        method: "POST",
        body: JSON.stringify(buildSetupAuthBody()),
      }),
    );
    expect(setupResponse.status).toBe(201);
    const setupBody = (await setupResponse.json()) as { email: string };
    const setCookies = extractSetCookies(setupResponse);
    const cookieHeader = cookieHeaderFromSetCookies(setCookies);
    const csrfToken = cookieValue(setCookies, "tinyclaw_csrf");

    const initResponse = await app.fetch(
      new Request("http://localhost:4310/v1/user/context/init", {
        method: "POST",
        headers: {
          Cookie: cookieHeader,
          "X-CSRF-Token": csrfToken,
        },
      }),
    );
    expect(initResponse.status).toBe(201);
    const initBody = (await initResponse.json()) as { created: boolean };
    expect(initBody.created).toBe(true);

    const getResponse = await app.fetch(
      new Request("http://localhost:4310/v1/user/context?content=true", {
        headers: { Cookie: cookieHeader },
      }),
    );
    expect(getResponse.status).toBe(200);
    const status = (await getResponse.json()) as { active: boolean; content?: string };
    expect(status.active).toBe(true);
    expect(status.content).toContain("# About Me");

    const writeResponse = await app.fetch(
      new Request("http://localhost:4310/v1/user/context", {
        method: "PUT",
        headers: {
          Cookie: cookieHeader,
          "X-CSRF-Token": csrfToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: "# About Me\n\nAlice from Acme" }),
      }),
    );
    expect(writeResponse.status).toBe(204);

    const user = await databaseAdapter.getUserByEmail(setupBody.email);
    expect(user).not.toBeNull();
    expect(await databaseAdapter.getUserContext(user!.id)).toBe("# About Me\n\nAlice from Acme");
  });
});
