import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { AuthService } from "../../../modules/auth/auth.service";
import { prisma } from "../../../db";
import { hashPassword } from "../../../utils/password";

describe("AuthService", () => {
  const authService = new AuthService();

  const originalUserFindFirst = prisma.user.findFirst;
  const originalUserFindUnique = prisma.user.findUnique;
  const originalUserCreate = prisma.user.create;

  afterEach(() => {
    (prisma.user as any).findFirst = originalUserFindFirst;
    (prisma.user as any).findUnique = originalUserFindUnique;
    (prisma.user as any).create = originalUserCreate;
  });

  describe("register", () => {
    it("should successfully register a new user", async () => {
      (prisma.user as any).findFirst = async () => null;
      (prisma.user as any).create = async (args: any) => ({
        id: "user-123",
        name: args.data.name,
        email: args.data.email,
        username: args.data.username,
      });

      const result = await authService.register({
        name: "John Doe",
        email: "John@Example.com",
        username: "JohnDoe",
        password: "password123",
      });

      expect(result).toEqual({
        id: "user-123",
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
      });
    });

    it("should throw error if email is already registered", async () => {
      (prisma.user as any).findFirst = async () => ({
        id: "existing-1",
        email: "john@example.com",
        username: "otheruser",
      });

      let err: any;
      try {
        await authService.register({
          name: "John Doe",
          email: "john@example.com",
          username: "johndoe",
          password: "password123",
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toBe("Email is already registered");
    });

    it("should throw error if username is already taken", async () => {
      (prisma.user as any).findFirst = async () => ({
        id: "existing-2",
        email: "other@example.com",
        username: "johndoe",
      });

      let err: any;
      try {
        await authService.register({
          name: "John Doe",
          email: "john@example.com",
          username: "johndoe",
          password: "password123",
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toBe("Username is already taken");
    });
  });

  describe("login", () => {
    it("should login successfully with valid email and password", async () => {
      const hashed = await hashPassword("correctPassword");
      (prisma.user as any).findFirst = async () => ({
        id: "user-123",
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        accounts: [
          {
            providerId: "credential",
            password: hashed,
          },
        ],
      });

      const result = await authService.login({
        email: "john@example.com",
        password: "correctPassword",
      });

      expect(result).toEqual({
        id: "user-123",
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
      });
    });

    it("should throw error if identifier is empty", async () => {
      let err: any;
      try {
        await authService.login({
          identifier: "",
          password: "any",
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toBe("Invalid email/username or password");
    });

    it("should throw error if user is not found", async () => {
      (prisma.user as any).findFirst = async () => null;

      let err: any;
      try {
        await authService.login({
          email: "nonexistent@example.com",
          password: "any",
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toBe("Invalid email/username or password");
    });

    it("should throw error if credential password does not match", async () => {
      const hashed = await hashPassword("correctPassword");
      (prisma.user as any).findFirst = async () => ({
        id: "user-123",
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        accounts: [
          {
            providerId: "credential",
            password: hashed,
          },
        ],
      });

      let err: any;
      try {
        await authService.login({
          email: "john@example.com",
          password: "wrongPassword",
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toBe("Invalid email/username or password");
    });
  });

  describe("getUserById", () => {
    it("should return user if found", async () => {
      const mockUser = {
        id: "user-123",
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.user as any).findUnique = async () => mockUser;

      const result = await authService.getUserById("user-123");
      expect(result).toEqual(mockUser);
    });

    it("should throw error if user not found", async () => {
      (prisma.user as any).findUnique = async () => null;

      let err: any;
      try {
        await authService.getUserById("non-existent");
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toBe("User not found");
    });
  });
});
