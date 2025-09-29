import { Hono } from "hono";

type Data = {
  fullName: string;
  phoneNumber?: string;
  website?: string;
  fbPage?: string;
  igPage?: string;
  tiktok?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.post("/api/add", async (c) => {
  const { fullName, fbPage, igPage, phoneNumber, tiktok, website } =
    await c.req.json<Data>();
  const stmnt = await c.env.DB.prepare(
    "INSERT INTO users (fullName,phoneNumber,fbPage,igPage,tiktok,website) VALUES (?,?,?,?,?,?)"
  )
    .bind(fullName, phoneNumber, fbPage, igPage, tiktok, website)
    .run();

  return c.json({});
});

app.get("/api/customer/:id", async (c) => {
  const userId = c.req.param("id");
  const query = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(userId)
    .first();

  return c.json(query);
});

export default app;
