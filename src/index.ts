import { Elysia, t } from "elysia";
import { db } from "./db";
import { users } from "./db/schema";
import { userRoutes } from "./routes/user-routes";
import { swagger } from "@elysiajs/swagger";

export const app = new Elysia()
  .use(swagger({
    documentation: {
      info: {
        title: "User Management API",
        version: "1.0.0",
        description: "Dokumentasi interaktif untuk aplikasi Vibe Coding"
      }
    }
  }))
  .get("/", () => ({
    status: "ok",
    message: "ElysiaJS + Drizzle + MySQL is running!"
  }))
  .get("/users", async () => {
    try {
      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      }).from(users);
      return { success: true, data: allUsers };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  })
  .use(userRoutes);

if (process.env.NODE_ENV !== "test") {
  app.listen(3000);
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
}
