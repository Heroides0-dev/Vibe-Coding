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
        name: t.String({ maxLength: 255 }),
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          user: t.Object({
            id: t.Number(),
            name: t.String(),
            email: t.String(),
            created_at: t.Union([t.String(), t.Null()]),
          }),
        }),
        400: t.Object({
          error: t.String(),
        }),
      },
      detail: {
        summary: "Registrasi User Baru",
        description: "Mendaftarkan akun pengguna baru ke dalam sistem.",
        tags: ["Users"],
      },
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
      response: {
        200: t.Object({
          message: t.String(),
          session: t.Object({
            token: t.String(),
          }),
        }),
        400: t.Object({
          error: t.String(),
          session: t.Null(),
        }),
      },
      detail: {
        summary: "Login User",
        description: "Melakukan login pengguna dan mengembalikan token sesi (session token).",
        tags: ["Users"],
      },
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
    },
    {
      headers: t.Object({
        authorization: t.Optional(t.String({ description: "Format: Bearer <session_token>" })),
      }),
      response: {
        200: t.Object({
          message: t.String(),
          user: t.Object({
            id: t.Number(),
            name: t.String(),
            email: t.String(),
            created_at: t.Union([t.String(), t.Null()]),
          }),
        }),
        401: t.Object({
          error: t.String(),
          user: t.Null(),
        }),
      },
      detail: {
        summary: "Get Current User",
        description: "Mengambil data profil pengguna yang saat ini sedang login menggunakan token sesi.",
        tags: ["Users"],
      },
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
    },
    {
      headers: t.Object({
        authorization: t.Optional(t.String({ description: "Format: Bearer <session_token>" })),
      }),
      response: {
        200: t.Object({
          message: t.String(),
          session: t.Object({
            token: t.String(),
          }),
        }),
        401: t.Object({
          error: t.String(),
          user: t.Null(),
        }),
      },
      detail: {
        summary: "Logout User",
        description: "Mengakhiri sesi pengguna dengan menghapus token sesi aktif dari database.",
        tags: ["Users"],
      },
    }
  );
