import { expect, describe, it } from "bun:test";
import { AuthService } from "./auth.service";
import { hashPassword } from "../../utils/password";

describe("AuthService Unit Tests", () => {
  it("should register a new user successfully", async () => {
    let createdUserData: any = null;

    const mockUserModel = {
      findOne: async () => null,
      create: async (data: any) => {
        createdUserData = data;
        return {
          _id: { toString: () => "mock-user-id-123" },
          name: data.name,
          email: data.email,
          username: data.username,
          password: data.password,
        };
      },
      findById: () => ({ select: async () => null }),
    };

    const authService = new AuthService(mockUserModel as any);

    const result = await authService.register({
      name: "Budi Santoso",
      email: "budi@example.com",
      username: "budisantoso",
      password: "password123",
    });

    expect(result.id).toBe("mock-user-id-123");
    expect(result.name).toBe("Budi Santoso");
    expect(result.email).toBe("budi@example.com");
    expect(result.username).toBe("budisantoso");
    expect(createdUserData.password).not.toBe("password123"); // Password is hashed
  });

  it("should reject registration if email is already registered", async () => {
    const mockUserModel = {
      findOne: async (query: any) => ({
        email: "budi@example.com",
        username: "otheruser",
      }),
      create: async () => {},
      findById: () => ({ select: async () => null }),
    };

    const authService = new AuthService(mockUserModel as any);

    expect(
      authService.register({
        name: "Budi Duplicate",
        email: "budi@example.com",
        username: "budi_new",
        password: "password123",
      })
    ).rejects.toThrow("Email is already registered");
  });

  it("should reject registration if username is already taken", async () => {
    const mockUserModel = {
      findOne: async (query: any) => ({
        email: "other@example.com",
        username: "budisantoso",
      }),
      create: async () => {},
      findById: () => ({ select: async () => null }),
    };

    const authService = new AuthService(mockUserModel as any);

    expect(
      authService.register({
        name: "Budi Duplicate",
        email: "newemail@example.com",
        username: "budisantoso",
        password: "password123",
      })
    ).rejects.toThrow("Username is already taken");
  });

  it("should login successfully with email or username identifier", async () => {
    const hashedPassword = await hashPassword("mySecretPassword!");

    const mockUser = {
      _id: { toString: () => "mock-user-id-456" },
      name: "Siti Aminah",
      email: "siti@example.com",
      username: "sitiaminah",
      password: hashedPassword,
    };

    const mockUserModel = {
      findOne: async (query: any) => {
        if (query?.$or) {
          const match = query.$or.some(
            (cond: any) =>
              cond.email === "siti@example.com" ||
              cond.username === "sitiaminah"
          );
          if (match) return mockUser;
        }
        return null;
      },
      create: async () => {},
      findById: () => ({ select: async () => null }),
    };

    const authService = new AuthService(mockUserModel as any);

    // Login via email
    const loginByEmail = await authService.login({
      email: "siti@example.com",
      password: "mySecretPassword!",
    });
    expect(loginByEmail.email).toBe("siti@example.com");
    expect(loginByEmail.name).toBe("Siti Aminah");

    // Login via identifier (username)
    const loginByUsername = await authService.login({
      identifier: "sitiaminah",
      password: "mySecretPassword!",
    });
    expect(loginByUsername.username).toBe("sitiaminah");
    expect(loginByUsername.id).toBe("mock-user-id-456");
  });

  it("should fail login with wrong password", async () => {
    const hashedPassword = await hashPassword("correctPassword123");

    const mockUser = {
      _id: { toString: () => "mock-user-id-789" },
      name: "Joko",
      email: "joko@example.com",
      username: "jokowi",
      password: hashedPassword,
    };

    const mockUserModel = {
      findOne: async () => mockUser,
      create: async () => {},
      findById: () => ({ select: async () => null }),
    };

    const authService = new AuthService(mockUserModel as any);

    expect(
      authService.login({
        identifier: "joko@example.com",
        password: "wrongPassword",
      })
    ).rejects.toThrow("Invalid email/username or password");
  });

  it("should fail login if user not found", async () => {
    const mockUserModel = {
      findOne: async () => null,
      create: async () => {},
      findById: () => ({ select: async () => null }),
    };

    const authService = new AuthService(mockUserModel as any);

    expect(
      authService.login({
        identifier: "nonexistent@example.com",
        password: "anyPassword",
      })
    ).rejects.toThrow("Invalid email/username or password");
  });
});
