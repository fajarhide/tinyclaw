import { createRoute, z } from "@hono/zod-openapi";
import type { HonoApp } from "../types";
import type { ServerOptions } from "../context";
import {
  assertBrowserCsrf,
  authenticateRequest,
  clearBrowserSessionCookies,
  createBrowserSessionResponse,
  errorResponse,
  json,
  readJson,
} from "../shared";

export function registerAuthRoutes(app: HonoApp, options: ServerOptions): void {
  const { authService, databaseAdapter } = options;
  const authCredentialsSchema = z.object({
    email: z.string(),
    password: z.string(),
  }).openapi("AuthCredentialsRequest");
  const authUserSchema = z.object({
    email: z.string(),
  }).openapi("AuthUserResponse");
  const loggedOutSchema = z.object({
    ok: z.boolean(),
  });
  const errorSchema = z.object({ error: z.string() }).openapi("ApiErrorResponse");

  const setupRoute = createRoute({
    method: "post",
    path: "/v1/auth/setup",
    tags: ["Auth"],
    summary: "Create the first admin account and browser session",
    operationId: "setupAuth",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: authCredentialsSchema } },
      },
    },
    responses: {
      201: { description: "Created admin user", content: { "application/json": { schema: authUserSchema } } },
      400: { description: "Error", content: { "application/json": { schema: errorSchema } } },
      409: { description: "Error", content: { "application/json": { schema: errorSchema } } },
      500: { description: "Error", content: { "application/json": { schema: errorSchema } } },
    },
  });

  const loginRoute = createRoute({
    method: "post",
    path: "/v1/auth/login",
    tags: ["Auth"],
    summary: "Log in with email and password",
    operationId: "loginAuth",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: authCredentialsSchema } },
      },
    },
    responses: {
      200: { description: "Logged in user", content: { "application/json": { schema: authUserSchema } } },
      401: { description: "Error", content: { "application/json": { schema: errorSchema } } },
      500: { description: "Error", content: { "application/json": { schema: errorSchema } } },
    },
  });

  const meRoute = createRoute({
    method: "get",
    path: "/v1/auth/me",
    tags: ["Auth"],
    summary: "Get the current authenticated user",
    operationId: "getAuthMe",
    responses: {
      200: { description: "Authenticated user", content: { "application/json": { schema: authUserSchema } } },
      401: { description: "Error", content: { "application/json": { schema: errorSchema } } },
      500: { description: "Error", content: { "application/json": { schema: errorSchema } } },
    },
  });

  const logoutRoute = createRoute({
    method: "post",
    path: "/v1/auth/logout",
    tags: ["Auth"],
    summary: "Log out and revoke the browser session",
    operationId: "logoutAuth",
    responses: {
      200: { description: "Logged out", content: { "application/json": { schema: loggedOutSchema } } },
      401: { description: "Error", content: { "application/json": { schema: errorSchema } } },
      403: { description: "Error", content: { "application/json": { schema: errorSchema } } },
      500: { description: "Error", content: { "application/json": { schema: errorSchema } } },
    },
  });

  app.openAPIRegistry.registerPath(setupRoute);
  app.post("/v1/auth/setup", async (c) => {
    if (!authService || !databaseAdapter) {
      return errorResponse("Authentication not configured", 500);
    }

    const userCount = await databaseAdapter.countUsers();
    if (userCount > 0) {
      return errorResponse("Admin user already exists", 409);
    }

    const body = await readJson<{ email: string; password: string }>(c.req.raw);
    if (!body.email?.trim() || !body.password?.trim()) {
      return errorResponse("Email and password are required.", 400);
    }

    const hash = await authService.hashPassword(body.password);
    const now = new Date().toISOString();
    const user = {
      id: "user_admin",
      email: body.email,
      passwordHash: hash,
      createdAt: now,
      updatedAt: now,
    };

    await databaseAdapter.createUser(user);
    const response = await createBrowserSessionResponse(authService, databaseAdapter, user);
    return json(response.body, 201, response.headers);
  });

  app.openAPIRegistry.registerPath(loginRoute);
  app.post("/v1/auth/login", async (c) => {
    if (!authService || !databaseAdapter) {
      return errorResponse("Authentication not configured", 500);
    }

    const body = await readJson<{ email: string; password: string }>(c.req.raw);
    const user = await databaseAdapter.getUserByEmail(body.email);
    if (!user) {
      return errorResponse("Invalid credentials", 401);
    }

    const valid = await authService.verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return errorResponse("Invalid credentials", 401);
    }

    const response = await createBrowserSessionResponse(authService, databaseAdapter, user);
    return json(response.body, 200, response.headers);
  });

  app.openapi(meRoute, async (c) => {
    if (!authService || !databaseAdapter) {
      return errorResponse("Authentication not configured", 500);
    }

    const auth = await authenticateRequest(c.req.raw, authService, databaseAdapter);
    if (!auth) {
      return errorResponse("Authentication required", 401);
    }

    return json({ email: auth.user.email }, 200);
  });

  app.openapi(logoutRoute, async (c) => {
    if (!authService || !databaseAdapter) {
      return errorResponse("Authentication not configured", 500);
    }

    const auth = await authenticateRequest(c.req.raw, authService, databaseAdapter);
    if (!auth) {
      return errorResponse("Authentication required", 401);
    }

    assertBrowserCsrf(c.req.raw, auth, authService);

    if (auth.mode === "browser-session" && auth.session) {
      const revokedAt = new Date().toISOString();
      await databaseAdapter.revokeBrowserSessionBySessionTokenHash(
        auth.session.sessionTokenHash,
        revokedAt,
      );
    }

    const headers = new Headers();
    clearBrowserSessionCookies(headers);
    return json({ ok: true }, 200, headers);
  });
}
