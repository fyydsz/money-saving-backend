import { describe, it, expect } from "bun:test";
import { hashPassword, verifyPassword } from "../../../utils/password";

describe("Password Utility", () => {
  it("should hash password with Argon2id and verify correctly", async () => {
    const rawPassword = "SecurePassword123!";
    const hashedPassword = await hashPassword(rawPassword);

    expect(hashedPassword).toBeDefined();
    expect(typeof hashedPassword).toBe("string");
    expect(hashedPassword).not.toEqual(rawPassword);
    expect(hashedPassword.startsWith("$argon2id$")).toBe(true);

    const isValid = await verifyPassword(rawPassword, hashedPassword);
    expect(isValid).toBe(true);
  });

  it("should return false when verifying an incorrect password", async () => {
    const rawPassword = "CorrectPassword123!";
    const wrongPassword = "WrongPassword456!";
    const hashedPassword = await hashPassword(rawPassword);

    const isValid = await verifyPassword(wrongPassword, hashedPassword);
    expect(isValid).toBe(false);
  });
});
