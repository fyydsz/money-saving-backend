import { Elysia } from "elysia";
import { auth } from "../auth";

export const betterAuthPlugin = new Elysia({ name: "better-auth" })
  .options("/api/auth/*", ({ request }) => {
    const origin = request.headers.get("origin") || "*";
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, Cookie, X-Requested-With",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
      },
    });
  })
  .all("/api/auth/*", async ({ request }) => {
    const res = await auth.handler(request);
    const origin = request.headers.get("origin");

    // Copy and append CORS headers to ensure the browser always receives them
    const headers = new Headers(res.headers);
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Credentials", "true");
      headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH"
      );
      headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Cookie, X-Requested-With"
      );
      headers.set("Vary", "Origin");
    }

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: headers,
    });
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
