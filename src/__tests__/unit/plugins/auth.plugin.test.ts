import { describe, it, expect } from "bun:test";
import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { authGuard } from "../../../plugins/auth.plugin";

describe("Auth Plugin - authGuard", () => {
  const secret = process.env.JWT_SECRET || "dev_secret_key_only";
  process.env.JWT_SECRET = secret;

  const app = new Elysia()
    .use(authGuard)
    .get("/public", ({ user }: any) => ({ user }))
    .guard({ isAuth: true }, (app) =>
      app.get("/protected", ({ user }: any) => ({
        message: "Protected data",
        user,
      }))
    );

  it("should return user: null on public route without token", async () => {
    const res = await app.handle(new Request("http://localhost/public"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
  });

  it("should block unauthenticated access on protected route (401)", async () => {
    const res = await app.handle(new Request("http://localhost/protected"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized access");
  });

  it("should allow authenticated access with valid JWT Bearer header", async () => {
    const signer = new Elysia().use(
      jwt({
        name: "jwt",
        secret,
      })
    ).get("/token", async ({ jwt }) => {
      return { token: await jwt.sign({ id: "user-jwt-1", email: "jwt@example.com" }) };
    });

    const tokenRes = await signer.handle(new Request("http://localhost/token"));
    const { token } = await tokenRes.json();

    const res = await app.handle(
      new Request("http://localhost/protected", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Protected data");
    expect(body.user.id).toBe("user-jwt-1");
  });
});
