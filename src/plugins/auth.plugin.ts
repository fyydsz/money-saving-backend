import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { auth } from "../auth";

export type AuthUser = { id: string; email?: string; name?: string };

export const authGuard = new Elysia({ name: "authGuard" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET!,
    })
  )
  .derive({ as: "global" }, async ({ jwt, headers, cookie: { auth_token }, request }) => {
    // 1. Try Better Auth session first
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      if (session?.user?.id) {
        return {
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          } as AuthUser,
        };
      }
    } catch { }

    // 2. Fallback to JWT Bearer / Cookie
    const authHeader = headers["authorization"];
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : auth_token?.value;

    if (!token) {
      return { user: null as AuthUser | null };
    }

    const payload = await jwt.verify(token as string);
    if (!payload || typeof payload !== "object" || !("id" in payload)) {
      return { user: null as AuthUser | null };
    }

    return {
      user: {
        id: (payload as any).id,
        email: (payload as any).email,
        name: (payload as any).name,
      } as AuthUser,
    };
  })
  .macro(({ onBeforeHandle }) => ({
    isAuth(enabled: boolean) {
      if (!enabled) return;
      onBeforeHandle(({ user, set }: any) => {
        if (!user) {
          set.status = 401;
          return { error: "Unauthorized access, please login first" };
        }
      });
    },
  }));
