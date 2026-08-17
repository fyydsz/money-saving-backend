import { describe, it, expect } from "bun:test";
import { betterAuthPlugin } from "../better-auth.plugin";

describe("Better Auth Plugin", () => {
  it("should export betterAuthPlugin as an Elysia instance", () => {
    expect(betterAuthPlugin).toBeDefined();
  });

  it("should have the correct plugin name", () => {
    // The plugin should be named 'better-auth' for proper Elysia deduplication
    expect((betterAuthPlugin as any).config?.name).toBe("better-auth");
  });
});
