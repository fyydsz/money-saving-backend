import { describe, it, expect, mock } from "bun:test";
import { prisma } from "../../../db";
import { cleanExpiredSessions, startSessionCleanupTask } from "../../../utils/cleanup";
import { logger } from "../../../utils/logger";

describe("Cleanup Utility", () => {
  it("should delete expired sessions and verifications", async () => {
    let sessionCalled = false;
    let verificationCalled = false;

    const originalSessionDeleteMany = prisma.session.deleteMany;
    const originalVerificationDeleteMany = prisma.verification.deleteMany;

    (prisma.session as any).deleteMany = async () => {
      sessionCalled = true;
      return { count: 3 };
    };
    (prisma.verification as any).deleteMany = async () => {
      verificationCalled = true;
      return { count: 2 };
    };

    let logMessage = "";
    const originalInfo = logger.info;
    logger.info = (msg: string) => {
      logMessage = msg;
    };

    await cleanExpiredSessions();

    expect(sessionCalled).toBe(true);
    expect(verificationCalled).toBe(true);
    expect(logMessage).toContain("Auto-cleanup");

    (prisma.session as any).deleteMany = originalSessionDeleteMany;
    (prisma.verification as any).deleteMany = originalVerificationDeleteMany;
    logger.info = originalInfo;
  });

  it("should handle error gracefully during cleanup", async () => {
    const originalSessionDeleteMany = prisma.session.deleteMany;
    (prisma.session as any).deleteMany = async () => {
      throw new Error("DB Error");
    };

    let errorLogged = false;
    const originalError = logger.error;
    logger.error = () => {
      errorLogged = true;
    };

    await cleanExpiredSessions();

    expect(errorLogged).toBe(true);

    (prisma.session as any).deleteMany = originalSessionDeleteMany;
    logger.error = originalError;
  });

  it("should start interval task and return interval id", () => {
    const intervalId = startSessionCleanupTask(10000);
    expect(intervalId).toBeDefined();
    clearInterval(intervalId);
  });
});
