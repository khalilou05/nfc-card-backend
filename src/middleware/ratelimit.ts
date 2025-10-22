import { createMiddleware } from "hono/factory";

export const rateLimitMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const ip = c.req.header("CF-Connecting-IP") || "unknown";

    // @ts-expect-error
    const { success } = await c.env.RATE_LIMITER.limit({ key: ip });
    if (!success) return c.json({ error: "too many request" }, 429);
    await next();
  }
);
