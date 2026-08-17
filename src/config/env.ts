if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("❌ JWT_SECRET must be set in production environment!");
}

export const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key_only";