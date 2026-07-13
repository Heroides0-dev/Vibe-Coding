import { Elysia, t } from "elysia";
import { registerUser } from "../services/user-services";

export const userRoutes = new Elysia({ prefix: "/api" })
  .post(
    "/users",
    async ({ body, set }) => {
      const result = await registerUser(body);

      if (!result.success) {
        set.status = 400;
        return {
          error: result.error,
        };
      }

      set.status = 201;
      return {
        message: "User created successfully",
        user: result.user,
      };
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    }
  );
