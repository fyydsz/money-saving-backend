import { describe, it, expect, afterEach } from "bun:test";
import { Elysia } from "elysia";
import { authController } from "../../../modules/auth/auth.controller";
import { prisma } from "../../../db";

describe("Auth Validation & Security Tests", () => {
  const app = new Elysia().use(authController);

  const origFindFirst = prisma.user.findFirst;
  const origCreate = prisma.user.create;

  afterEach(() => {
    (prisma.user as any).findFirst = origFindFirst;
    (prisma.user as any).create = origCreate;
  });

  describe("Username validation", () => {
    it("should reject usernames with forbidden special characters (e.g. @, #, $, !, space)", async () => {
      const invalidUsernames = [
        "john@doe",
        "john doe",
        "john#123",
        "john$money",
        "john!cool",
        "john*star",
        "john(doe)",
        "john%percent",
        "john/slash",
        "john\\backslash",
        "john<script>",
      ];

      for (const username of invalidUsernames) {
        const res = await app.handle(
          new Request("http://localhost/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "John Doe",
              email: "valid@example.com",
              username,
              password: "ValidPassword123!",
            }),
          })
        );

        expect(res.status).toBe(422); // Elysia validation error
      }
    });

    it("should reject usernames that are too short (< 3 chars)", async () => {
      const shortUsernames = ["a", "ab", ""];

      for (const username of shortUsernames) {
        const res = await app.handle(
          new Request("http://localhost/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "John Doe",
              email: "valid@example.com",
              username,
              password: "ValidPassword123!",
            }),
          })
        );

        expect(res.status).toBe(422);
      }
    });

    it("should reject usernames that are too long (> 30 chars)", async () => {
      const longUsername = "a".repeat(31);

      const res = await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            email: "valid@example.com",
            username: longUsername,
            password: "ValidPassword123!",
          }),
        })
      );

      expect(res.status).toBe(422);
    });

    it("should accept valid usernames with alphanumeric, underscore, and dot", async () => {
      (prisma.user as any).findFirst = async () => null;
      (prisma.user as any).create = async (args: any) => ({
        id: "new-user-id",
        name: args.data.name,
        email: args.data.email,
        username: args.data.username,
      });

      const validUsernames = [
        "john_doe",
        "john.doe",
        "johndoe123",
        "user_name.456",
        "abc",
        "a".repeat(30),
      ];

      for (const username of validUsernames) {
        const res = await app.handle(
          new Request("http://localhost/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "John Doe",
              email: "valid@example.com",
              username,
              password: "ValidPassword123!",
            }),
          })
        );

        expect(res.status).toBe(201);
      }
    });
  });

  describe("Email validation", () => {
    it("should reject invalid email formats", async () => {
      const invalidEmails = [
        "not-an-email",
        "plainaddress",
        "@missingusername.com",
        "username@.com",
        "username@domain..com",
      ];

      for (const email of invalidEmails) {
        const res = await app.handle(
          new Request("http://localhost/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "John Doe",
              email,
              username: "valid_username",
              password: "ValidPassword123!",
            }),
          })
        );

        expect(res.status).toBe(422);
      }
    });
  });

  describe("Password validation", () => {
    it("should reject passwords shorter than 6 characters", async () => {
      const shortPasswords = ["1", "12", "123", "1234", "12345"];

      for (const password of shortPasswords) {
        const res = await app.handle(
          new Request("http://localhost/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "John Doe",
              email: "valid@example.com",
              username: "valid_username",
              password,
            }),
          })
        );

        expect(res.status).toBe(422);
      }
    });

    it("should reject passwords longer than 100 characters", async () => {
      const longPassword = "a".repeat(101);

      const res = await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "John Doe",
            email: "valid@example.com",
            username: "valid_username",
            password: longPassword,
          }),
        })
      );

      expect(res.status).toBe(422);
    });
  });

  describe("Name validation", () => {
    it("should reject name shorter than 2 characters or longer than 50 characters", async () => {
      const invalidNames = ["A", "a".repeat(51)];

      for (const name of invalidNames) {
        const res = await app.handle(
          new Request("http://localhost/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              email: "valid@example.com",
              username: "valid_username",
              password: "ValidPassword123!",
            }),
          })
        );

        expect(res.status).toBe(422);
      }
    });
  });

  describe("Login validation", () => {
    it("should reject login request with empty password", async () => {
      const res = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: "valid_user",
            password: "",
          }),
        })
      );

      expect(res.status).toBe(422);
    });

    it("should reject login request with invalid email format if email field provided", async () => {
      const res = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "invalid-email-format",
            password: "SomePassword123!",
          }),
        })
      );

      expect(res.status).toBe(422);
    });
  });
});
