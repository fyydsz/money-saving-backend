import { describe, it, expect } from "bun:test";
import { auth } from "../auth";

describe("Better Auth Configuration", () => {
  it("should have auth instance defined", () => {
    expect(auth).toBeDefined();
  });

  it("should have api methods available", () => {
    expect(auth.api).toBeDefined();
    expect(auth.api.getSession).toBeDefined();
    expect(auth.api.signUpEmail).toBeDefined();
    expect(auth.api.signInEmail).toBeDefined();
  });

  it("should have handler function for Elysia mount", () => {
    expect(auth.handler).toBeDefined();
    expect(typeof auth.handler).toBe("function");
  });
});
