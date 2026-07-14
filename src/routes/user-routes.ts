import { Elysia, t } from "elysia";
import { registerUser, loginUser, getCurrentUser, logoutUser } from "../services/user-services";

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
  )
  .post(
    "/users/login",
    async ({ body, set }) => {
      const result = await loginUser(body);

      if (!result.success) {
        set.status = 400;
        return {
          error: result.error,
          session: null,
        };
      }

      return {
        message: "User login successfully",
        session: result.session,
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    }
  )
  .get(
    "/users/current",
    async ({ headers, set }) => {
      const authHeader = headers["authorization"];
      if (!authHeader) {
        set.status = 401;
        return {
          error: "Unauthorized",
          user: null,
        };
      }

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

      const result = await getCurrentUser(token);

      if (!result.success) {
        set.status = 401;
        return {
          error: result.error,
          user: null,
        };
      }

      return {
        message: "User get successfully",
        user: result.user,
      };
    }
  )
  .delete(
    "/users/logout",
    async ({ headers, set }) => {
      const authHeader = headers["authorization"];
      if (!authHeader) {
        set.status = 401;
        return {
          error: "Unauthorized",
          user: null,
        };
      }

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

      const result = await logoutUser(token);

      if (!result.success) {
        set.status = 401;
        return {
          error: result.error,
          user: null,
        };
      }

      return {
        message: "User logout successfully",
        session: {
          token: result.token,
        },
      };
    }
  );
