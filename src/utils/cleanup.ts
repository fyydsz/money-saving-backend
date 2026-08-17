import { prisma } from "../db";

/**
 * Deletes expired sessions and verification tokens from the database.
 */
export async function cleanExpiredSessions() {
  try {
    const now = new Date();

    const [deletedSessions, deletedVerifications] = await Promise.all([
      prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      }),
      prisma.verification.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      }),
    ]);

    const totalCleaned = deletedSessions.count + deletedVerifications.count;
    if (totalCleaned > 0) {
      console.log(
        `🧹 Auto-cleanup: Removed ${deletedSessions.count} expired sessions and ${deletedVerifications.count} expired verifications`
      );
    }
  } catch (error) {
    console.error("❌ Auto-cleanup error:", error);
  }
}

/**
 * Starts a recurring background task to clean expired sessions.
 * Default interval: 1 hour (3600000 ms)
 */
export function startSessionCleanupTask(intervalMs = 1000 * 60 * 60) {
  // Run once immediately on startup
  cleanExpiredSessions();

  // Schedule periodic cleanup
  const intervalId = setInterval(cleanExpiredSessions, intervalMs);

  // Unref interval so it doesn't block graceful process exit
  if (typeof intervalId.unref === "function") {
    intervalId.unref();
  }

  return intervalId;
}
