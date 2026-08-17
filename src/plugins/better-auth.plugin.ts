import { Elysia } from "elysia";
import { auth } from "../auth";

export const betterAuthPlugin = new Elysia({ name: "better-auth-plugin" })
  .all("/api/auth/*", ({ request }) => auth.handler(request))
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
