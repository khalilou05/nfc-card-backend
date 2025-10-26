import { Hono } from "hono";
import { cors } from "hono/cors";
import { sign } from "hono/jwt";
import { authMiddleware, rateLimitMiddleware } from "./middleware";
import { deleteCookie, setCookie } from "hono/cookie";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin) => {
      // ✅ Allow your frontend origin
      if (origin === "http://localhost:3000") return origin;
      // optionally allow production
      if (origin === "https://nfc-card-app.khalilbenmeziane.workers.dev")
        return origin;
      return ""; // or throw error if you want to restrict others
    },
    credentials: true, // ✅ must be true to allow cookies
  })
);

app.use("*", rateLimitMiddleware);

app.post("/login", async (c) => {
  const ip = c.req.header("cf-connecting-ip") || "unkown";
  // @ts-expect-error
  const { success } = await c.env.LOGIN_RATE_LIMITER.limit({ key: ip });
  if (!success) return c.json({ error: "too many requests" }, 429);
  try {
    const { email, password } = await c.req.json<{
      email: string;
      password: string;
    }>();
    const query = await c.env.DB.prepare(
      "SELECT id,email,password from users WHERE email=?"
    )
      .bind(email)
      .first<{ id: number; password: string; email: string; role: string }>();
    if (query && email === query.email && password === query.password) {
      const token = await sign(
        {
          sub: query.id,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        },
        c.env.JWT_SECRET
      );
      setCookie(c, "token", token, {
        path: "/",
        secure: true,
        sameSite: "None",
        httpOnly: true,
        domain: ".khalilbenmeziane.workers.dev",
      });
      return c.text("ok", 200);
    }
    return c.json({ error: "invalid email or password" }, 401);
  } catch (error) {
    console.log(error);
    return c.json({ error: "somthing go wrong" });
  }
});

app.get("logout", async (c) => {
  deleteCookie(c, "token", { secure: true, httpOnly: true, path: "/" });
  return c.text("", 200);
});

app.get("/customers/:id", async (c) => {
  const userId = c.req.param("id");
  try {
    const query = await c.env.DB.prepare("SELECT * FROM customers WHERE id = ?")
      .bind(userId)
      .first();
    if (!query) return c.text("not found", 404);

    return c.json(query);
  } catch (error) {
    console.log(error);
  }
});

// ! PROTECTED ROUTES

app.use("/api/*", authMiddleware);

app.post("/api/logout", async (c) => {
  deleteCookie(c, "token", { path: "/dashboard" });
  return c.text("ok", 200);
});
app.post("/api/resetpassword", async (c) => {
  const { email, newpassword } = await c.req.json<{
    email: string;
    newpassword: string;
    confirmpassword: string;
  }>();
  try {
    const res = await c.env.DB.prepare(
      "UPDATE users SET email=?, password = ? WHERE id=1 "
    )
      .bind(email, newpassword)
      .run();

    return c.text("ok", 200);
  } catch (e) {
    console.log(e);
    return c.text("", 500);
  }
});

app.delete("/api/customers", async (c) => {
  try {
    const usersToDelete = await c.req.json<number[]>();
    const deleteStmnt = usersToDelete.map((id) =>
      c.env.DB.prepare("DELETE FROM customers WHERE id = ?").bind(id)
    );
    const deleteBatchRes = await c.env.DB.batch(deleteStmnt);

    return c.text("", 200);
  } catch (e) {
    console.log(e);

    return c.json({ error: "somthing go wrong" });
  }
});

app.post("/api/customers", async (c) => {
  const data = await c.req.formData();
  const profileImg = data.get("profileImg") as File;
  const coverImg = data.get("coverImg") as File;
  const fullName = data.get("fullName");
  const phoneNumber = data.get("phoneNumber");
  const email = data.get("email");
  const socialMedia = data.get("socialMedia");
  const imgKey: string[] = [];
  try {
    const media = [profileImg, coverImg];
    await Promise.allSettled(
      media.map((itm) => {
        const extenstion = itm.name.split(".").pop();
        const url = crypto.randomUUID().replaceAll("-", "") + "." + extenstion;
        imgKey.push(url);
        return c.env.BUCKET.put(url, itm.stream(), {
          httpMetadata: { contentType: itm.type },
        });
      })
    );
  } catch (error) {
    console.log(error);
  }

  const stmnt = await c.env.DB.prepare(
    "INSERT INTO customers (fullName,email,phoneNumber,socialMedia,profileImg,coverImg,createdAt) VALUES (?,?,?,?,?,?,datetime('now'))"
  )
    .bind(fullName, email, phoneNumber, socialMedia, imgKey[0], imgKey[1])
    .run();

  return c.json({ userId: stmnt.meta.last_row_id }, 201);
});
app.put("/api/customers", async (c) => {
  const data = await c.req.formData();

  console.log(data);

  const newprofileImg = data.get("newprofileImg") as File;
  const newcoverImg = data.get("newcoverImg") as File;
  const coverImgkey = data.get("coverImg");
  const profileImgkey = data.get("profileImg");
  const fullName = data.get("fullName");
  const id = data.get("id");
  const email = data.get("fullName");
  const phoneNumber = data.get("phoneNumber");
  const socialMedia = data.get("socialMedia");
  try {
    if (newcoverImg && newprofileImg) {
      const prm1 = c.env.BUCKET.put(
        coverImgkey as string,
        newcoverImg.stream(),
        {
          httpMetadata: { contentType: newcoverImg.type },
        }
      );
      const prm2 = c.env.BUCKET.put(
        profileImgkey as string,
        newprofileImg.stream(),
        {
          httpMetadata: { contentType: newprofileImg.type },
        }
      );
      await Promise.allSettled([prm1, prm2]);
    }

    const stmnt = await c.env.DB.prepare(
      "UPDATE customers SET fullName = ? ,phoneNumber =?, email=?,socialMedia=? WHERE id = ?"
    )
      .bind(fullName, phoneNumber, email, socialMedia, id)
      .run();

    return c.json({ userId: stmnt.meta.last_row_id }, 201);
  } catch (error) {
    console.log(error);
  }
});

app.get("/api/customers", async (c) => {
  const { q, page = 1 } = c.req.query();
  let baseQuery = "FROM customers";

  const params = [];

  if (q) {
    baseQuery += " WHERE fullName LIKE ? OR phoneNumber LIKE ?";
    params.push(`${q}%`, `${q}%`);
  }

  const offset = Number(page - 1) * 10;

  const { results } = await c.env.DB.prepare(
    `SELECT * ${baseQuery} LIMIT 10 OFFSET ?`
  )
    .bind(...params, offset)
    .all();

  const { results: countResult } = await c.env.DB.prepare(
    `SELECT COUNT(*) as count ${baseQuery}`
  )
    .bind(...params)
    .all();

  const { results: totalCustomerRes } = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM customers`
  ).all();

  const total = countResult?.[0]?.count ?? 0;
  const totalCustomer = totalCustomerRes?.[0]?.count ?? 0;

  return c.json({
    data: results,
    totalCustomer: totalCustomer,
    totalPages: Math.ceil(total / 10),
  });
});

app.get("/api/customers/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const resp = await c.env.DB.prepare("SELECT * FROM customers WHERE id=?")
      .bind(id)
      .first();
    return c.json(resp);
  } catch (e) {
    return c.text((e as Error).message, 500);
  }
});

export default app;
