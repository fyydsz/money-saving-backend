import { Elysia } from "elysia";
import { auth } from "../auth";

export const betterAuthPlugin = new Elysia({ name: "better-auth" })
  .all("/api/auth/*", async (context) => {
    const res = await auth.handler(context.request);
    const origin = context.request.headers.get("origin");

    // Reconstruct response to safely mutate headers
    const response = new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: new Headers(res.headers),
    });

    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Cookie"
      );
    }

    return response;
  })
  .macro({
    auth: {
      async resolve({ status, request }: any) {
        const session = await auth.api.getSession({
          headers: request.headers,
        });

        if (!session) {
          return status(401);
        }

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });
