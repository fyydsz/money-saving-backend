import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { connectDB } from "./db";
import { authController } from "./modules/auth/auth.controller";
import { vaultController } from "./modules/vault/vault.controller";
import { categoryLabelController } from "./modules/category-label/category-label.controller";
import { transactionController } from "./modules/transaction/transaction.controller";
import { socialController } from "./modules/social/social.controller";
import { goalController } from "./modules/goal/goal.controller";
import { notificationController } from "./modules/notification/notification.controller";
import { authGuard } from "./plugins/auth.plugin";
import { AuthService } from "./modules/auth/auth.service";
import { betterAuthPlugin } from "./plugins/better-auth.plugin";
import { loggerPlugin } from "./plugins/logger.plugin";
import { logger } from "./utils/logger";
import { auth } from "./auth";
import { startSessionCleanupTask } from "./utils/cleanup";

// Initialize DB connection
await connectDB();

// Start background task to clean expired sessions periodically
startSessionCleanupTask();

const authService = new AuthService();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8000;

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8000",
  "https://vaultin.web.id",
  "https://www.vaultin.web.id",
  "https://preview.vaultin.web.id",
];

const app = new Elysia()
  // Request logger plugin — must be first to capture all incoming requests
  .use(loggerPlugin)
  .use(
    cors({
      origin: true,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
      exposeHeaders: ["Set-Cookie"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    })
  )
  // Better Auth endpoint (/api/auth/*) — must be first
  .use(betterAuthPlugin)
  // Legacy / Custom Auth endpoint (/auth/*) for backward compatibility
  .use(authController)
  // Auth guard for protected routes
  .use(authGuard)
  // Money Saving Modules
  .use(vaultController)
  .use(categoryLabelController)
  .use(transactionController)
  .use(socialController)
  .use(goalController)
  .use(notificationController)
  // Profile endpoint supporting both Better Auth session and JWT
  .get(
    "/profile",
    async ({ request, user, set }: any) => {
      // 1. Try Better Auth session first
      try {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (session?.user) {
          return { user: session.user };
        }
      } catch {}

      // 2. Fallback to JWT auth plugin
      if (user?.id) {
        try {
          const fullProfile = await authService.getUserById(user.id);
          return { user: fullProfile };
        } catch (err: any) {
          set.status = 404;
          return { error: err.message };
        }
      }

      set.status = 401;
      return { error: "Unauthorized access, please login first" };
    }
  )
  .listen({
    port,
    hostname: "0.0.0.0",
  });

logger.info(`🦊 Server running at http://${app.server?.hostname}:${app.server?.port}`);