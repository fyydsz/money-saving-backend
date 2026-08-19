import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { logger } from "../utils/logger";

declare global {
  var prisma: PrismaClient | undefined;
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  "postgresql://postgres:postgres@localhost:5432/postgres";

const isCloudDB =
  connectionString.includes("supabase.com") ||
  connectionString.includes("supabase.co") ||
  process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString,
  ssl: isCloudDB ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);

export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export const connectDB = async () => {
  try {
    logger.info("🔗 Connecting to PostgreSQL (Supabase)...");
    await prisma.$connect();
    logger.info("🐘 PostgreSQL (Supabase) connected successfully");
  } catch (error) {
    logger.error("❌ PostgreSQL connection error:", error);
  }
};

export default prisma;