import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";

export const authMiddleware = createMiddleware(async (c, next) => {
  const token = getCookie(c, "token");

  if (!token) return c.text("Unauthorized", 401);
  try {
    const claims = await verify(token, c.env.JWT_SECRET);

    await next();
  } catch (e) {
    console.log(e);

    return c.text("Unauthorized", 401);
  }
});
