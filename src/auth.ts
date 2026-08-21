import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { username } from "better-auth/plugins";
import { prisma } from "./db";

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8000",
  "https://vaultin.web.id",
  "https://www.vaultin.web.id",
  "https://preview.vaultin.web.id",
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:8000",
  basePath: "/api/auth",
  trustedOrigins: allowedOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username(),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cookie cache to reduce DB lookups
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    },
  },
});
