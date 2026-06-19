import type { OpenAPIHono } from "@hono/zod-openapi";

export type HonoApp = OpenAPIHono<{
  Variables: {
    trustedAuthMode?: string;
  };
}>;
