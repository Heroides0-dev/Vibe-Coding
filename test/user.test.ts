import { describe, expect, it, beforeEach } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { users, session } from "../src/db/schema";
import { eq } from "drizzle-orm";

describe("User API Endpoints", () => {
  beforeEach(async () => {
    // Clean up database before each test
    await db.delete(session);
    await db.delete(users);
  });

  describe("POST /api/users (Registration)", () => {
    it("should register a new user successfully", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test.register@example.com",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.message).toBe("User created successfully");
      expect(body.user.name).toBe("Test User");
      expect(body.user.email).toBe("test.register@example.com");
      expect(body.user.id).toBeDefined();
    });

    it("should fail to register when email is already registered", async () => {
      // Register first user
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User 1",
            email: "duplicate@example.com",
            password: "password123",
          }),
        })
      );

      // Register second user with same email
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User 2",
            email: "duplicate@example.com",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Email already exists");
    });

    it("should fail to register when payload is missing required fields", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            // missing email and password
          }),
        })
      );

      expect(res.status).toBe(422); // Validation error
    });

    it("should fail to register when email format is invalid", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "invalid-email-format",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(422); // Validation error
    });

    it("should fail to register when name exceeds 255 characters", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "a".repeat(256),
            email: "test.longname@example.com",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(422); // Validation error
    });
  });

  describe("POST /api/users/login (Login)", () => {
    beforeEach(async () => {
      // Seed a user for login tests
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Login User",
            email: "login@example.com",
            password: "correctpassword",
          }),
        })
      );
    });

    it("should login successfully with correct credentials", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "login@example.com",
            password: "correctpassword",
          }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("User login successfully");
      expect(body.session.token).toBeDefined();
    });

    it("should fail login when email is not found", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "nonexistent@example.com",
            password: "correctpassword",
          }),
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("User not found");
      expect(body.session).toBeNull();
    });

    it("should fail login when password is incorrect", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "login@example.com",
            password: "wrongpassword",
          }),
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("User not found"); // Standard security message in our service
      expect(body.session).toBeNull();
    });

    it("should fail login when payload is invalid", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "not-an-email",
            // missing password
          }),
        })
      );

      expect(res.status).toBe(422); // Validation error
    });
  });

  describe("GET /api/users/current (Get Current User)", () => {
    let validToken: string;

    beforeEach(async () => {
      // Register
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Current User",
            email: "current@example.com",
            password: "password123",
          }),
        })
      );

      // Login to get token
      const loginRes = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "current@example.com",
            password: "password123",
          }),
        })
      );
      const loginBody = await loginRes.json();
      validToken = loginBody.session.token;
    });

    it("should retrieve current user profile with valid token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${validToken}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("User get successfully");
      expect(body.user.name).toBe("Current User");
      expect(body.user.email).toBe("current@example.com");
    });

    it("should fail to retrieve user profile when Authorization header is missing", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
      expect(body.user).toBeNull();
    });

    it("should fail to retrieve user profile when token is invalid", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            "Authorization": "Bearer invalid-token-uuid",
          },
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
      expect(body.user).toBeNull();
    });
  });

  describe("DELETE /api/users/logout (Logout)", () => {
    let validToken: string;

    beforeEach(async () => {
      // Register
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Logout User",
            email: "logout@example.com",
            password: "password123",
          }),
        })
      );

      // Login to get token
      const loginRes = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "logout@example.com",
            password: "password123",
          }),
        })
      );
      const loginBody = await loginRes.json();
      validToken = loginBody.session.token;
    });

    it("should logout successfully and delete session token", async () => {
      // Perform logout
      const logoutRes = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${validToken}`,
          },
        })
      );

      expect(logoutRes.status).toBe(200);
      const logoutBody = await logoutRes.json();
      expect(logoutBody.message).toBe("User logout successfully");
      expect(logoutBody.session.token).toBe(validToken);

      // Check current user should now be unauthorized
      const currentRes = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${validToken}`,
          },
        })
      );
      expect(currentRes.status).toBe(401);
    });

    it("should fail logout when Authorization header is missing", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
      expect(body.user).toBeNull();
    });

    it("should fail logout when performing repeated logout on same token", async () => {
      // First logout (Success)
      await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${validToken}`,
          },
        })
      );

      // Second logout (Fail)
      const res = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${validToken}`,
          },
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
      expect(body.user).toBeNull();
    });
  });
});
