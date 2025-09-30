import { Hono } from "hono";
import { cors } from "hono/cors";

type Data = {
  fullName: string;
  phoneNumber?: string;
  website?: string;
  fbPage?: string;
  igPage?: string;
  tiktok?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.post("/api/add", async (c) => {
  const { fullName, fbPage, igPage, phoneNumber, tiktok, website } =
    await c.req.json<Data>();
  console.log(fullName, fbPage);

  const stmnt = await c.env.DB.prepare(
    "INSERT INTO users (fullName,phoneNumber,fbPage,igPage,tiktok,website) VALUES (?,?,?,?,?,?)"
  )
    .bind(fullName, phoneNumber, fbPage, igPage, tiktok, website)
    .run();

  return c.json({ userId: stmnt.meta.last_row_id }, 201);
});

app.get("/api/customers/:id", async (c) => {
  try {
    const userId = c.req.param("id");
    const query = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first();
    if (!query) return c.text("not found", 404);

    return c.json(query);
  } catch (e) {
    console.log(e);
  }
});

export default app;
